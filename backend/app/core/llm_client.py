from __future__ import annotations

import json
import time
from typing import Any, Protocol

import httpx

from app import prompts

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

_MAX_ATTEMPTS = 5
_BACKOFF_BASE_S = 2.0
_BACKOFF_CAP_S = 60.0


class LlmClientError(RuntimeError):
    pass


class LlmRateLimitError(LlmClientError):
    """429s outlasted every retry: usually a daily quota, so batch callers stop."""


class LlmClient(Protocol):
    def complete_json(
        self, system: str, user: str, response_schema: dict[str, Any]
    ) -> dict[str, Any]:
        ...


class _RateLimiter:
    def __init__(self, max_rpm: int):
        self._min_interval = 60.0 / max_rpm if max_rpm > 0 else 0.0
        self._last_call: float | None = None

    def wait(self) -> None:
        if self._min_interval <= 0:
            return
        if self._last_call is not None:
            elapsed = time.monotonic() - self._last_call
            remaining = self._min_interval - elapsed
            if remaining > 0:
                time.sleep(remaining)
        self._last_call = time.monotonic()


def _retry_after_seconds(response: httpx.Response, attempt: int, cap_s: float) -> float:
    header = response.headers.get("Retry-After")
    if header:
        try:
            return min(float(header), cap_s)
        except ValueError:
            pass
    return min(_BACKOFF_BASE_S * (2 ** attempt), cap_s)


class _BaseHttpClient:
    def __init__(
        self,
        model: str,
        max_rpm: int,
        timeout_s: float,
        max_attempts: int = _MAX_ATTEMPTS,
        backoff_cap_s: float = _BACKOFF_CAP_S,
    ):
        self.model = model
        self._limiter = _RateLimiter(max_rpm)
        self._client = httpx.Client(timeout=timeout_s)
        self._max_attempts = max_attempts
        self._backoff_cap_s = backoff_cap_s

    def _post(self, url: str, json_body: dict, headers: dict | None = None) -> dict:
        last_error: Exception | None = None
        for attempt in range(self._max_attempts):
            self._limiter.wait()
            try:
                response = self._client.post(url, json=json_body, headers=headers)
            except httpx.HTTPError as exc:
                last_error = exc
                time.sleep(min(_BACKOFF_BASE_S * (2 ** attempt), self._backoff_cap_s))
                continue

            if response.status_code == 429 or response.status_code >= 500:
                error_cls = (
                    LlmRateLimitError if response.status_code == 429 else LlmClientError
                )
                last_error = error_cls(
                    f"HTTP {response.status_code}: {response.text[:300]}"
                )
                if attempt < self._max_attempts - 1:
                    time.sleep(_retry_after_seconds(response, attempt, self._backoff_cap_s))
                    continue
                raise last_error

            if response.status_code >= 400:
                raise LlmClientError(
                    f"HTTP {response.status_code}: {response.text[:300]}"
                )

            return response.json()

        raise LlmClientError(f"Exhausted retries: {last_error}")

    @staticmethod
    def _parse_json_text(text: str) -> dict[str, Any]:
        return json.loads(text)

    def close(self) -> None:
        self._client.close()


class GeminiClient(_BaseHttpClient):
    def __init__(
        self,
        api_key: str,
        model: str,
        max_rpm: int = 10,
        timeout_s: float = 60.0,
        **retry: Any,
    ):
        if not api_key:
            raise LlmClientError("GEMINI_API_KEY is not set")
        super().__init__(model, max_rpm, timeout_s, **retry)
        self._api_key = api_key

    def complete_json(
        self, system: str, user: str, response_schema: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"{GEMINI_API_BASE}/models/{self.model}:generateContent"
        headers = {"x-goog-api-key": self._api_key}

        def call(user_text: str) -> str:
            body = {
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user_text}]}],
                "generationConfig": {
                    "temperature": 0,
                    "responseMimeType": "application/json",
                    "responseSchema": _to_gemini_schema(response_schema),
                },
            }
            envelope = self._post(url, body, headers=headers)
            try:
                return envelope["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as exc:
                raise LlmClientError(
                    f"Unexpected Gemini response shape: {str(envelope)[:300]}"
                ) from exc

        return _parse_with_repair(call, user)


class GroqClient(_BaseHttpClient):
    """Groq's OpenAI-compatible API with strict json_schema output.

    Strict mode is only available on openai/gpt-oss-* and qwen/qwen3.8-27b.
    Reasoning tokens count against Groq's tokens-per-minute limit, so
    reasoning_effort is kept low and the completion is capped.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        reasoning_effort: str = "low",
        max_completion_tokens: int = 2048,
        max_rpm: int = 10,
        timeout_s: float = 60.0,
        **retry: Any,
    ):
        if not api_key:
            raise LlmClientError("GROQ_API_KEY is not set")
        super().__init__(model, max_rpm, timeout_s, **retry)
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._reasoning_effort = reasoning_effort
        self._max_completion_tokens = max_completion_tokens

    def complete_json(
        self, system: str, user: str, response_schema: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"{self._base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self._api_key}"}
        strict_schema = _to_strict_schema(response_schema)

        def call(user_text: str) -> str:
            body: dict[str, Any] = {
                "model": self.model,
                "temperature": 0,
                "max_completion_tokens": self._max_completion_tokens,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_text},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "response",
                        "strict": True,
                        "schema": strict_schema,
                    },
                },
            }
            if self._reasoning_effort:
                body["reasoning_effort"] = self._reasoning_effort
            envelope = self._post(url, body, headers=headers)
            try:
                return envelope["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as exc:
                raise LlmClientError(
                    f"Unexpected Groq response shape: {str(envelope)[:300]}"
                ) from exc

        result = _parse_with_repair(call, user)
        # Strict mode forces optional fields to be sent as null; drop them so
        # callers see the same "absent" shape Gemini produces.
        optional = set(response_schema.get("properties", {})) - set(
            response_schema.get("required", [])
        )
        return {k: v for k, v in result.items() if not (k in optional and v is None)}


def _parse_with_repair(call, user: str) -> dict[str, Any]:
    text = call(user)
    try:
        return json.loads(text)
    except json.JSONDecodeError as first_error:
        repair_user = prompts.render(
            "common/json_repair.md", prompt=user, error=str(first_error)
        )
        text = call(repair_user)
        try:
            return json.loads(text)
        except json.JSONDecodeError as second_error:
            raise LlmClientError(
                f"Model did not return valid JSON after repair: {second_error}. "
                f"Raw: {text[:300]}"
            ) from second_error


def _to_gemini_schema(schema: dict[str, Any]) -> dict[str, Any]:
    return _strip_unsupported(schema)


def _to_strict_schema(node: Any) -> Any:
    """Rewrite a Gemini-style schema for OpenAI/Groq strict mode: every object
    is closed and lists all properties as required, and properties that were
    optional become nullable instead."""
    if isinstance(node, list):
        return [_to_strict_schema(v) for v in node]
    if not isinstance(node, dict):
        return node
    result = {
        k: _to_strict_schema(v)
        for k, v in node.items()
        if k not in ("propertyOrdering", "properties", "required")
    }
    if node.get("type") == "object" and "properties" in node:
        required = set(node.get("required", []))
        properties: dict[str, Any] = {}
        for name, prop in node["properties"].items():
            prop = _to_strict_schema(prop)
            if name not in required:
                prop = {"anyOf": [prop, {"type": "null"}]}
            properties[name] = prop
        result["properties"] = properties
        result["required"] = list(node["properties"])
        result["additionalProperties"] = False
    return result


_UNSUPPORTED_KEYWORDS = {"additionalProperties", "$schema", "title"}


def _strip_unsupported(node: Any) -> Any:
    if isinstance(node, dict):
        result: dict[str, Any] = {}
        for key, value in node.items():
            if key in _UNSUPPORTED_KEYWORDS:
                continue
            if key == "properties" and isinstance(value, dict):
                result[key] = {
                    field: _strip_unsupported(field_schema)
                    for field, field_schema in value.items()
                }
            else:
                result[key] = _strip_unsupported(value)
        return result
    if isinstance(node, list):
        return [_strip_unsupported(v) for v in node]
    return node


def create_llm_client(
    provider: str | None = None, model: str | None = None, interactive: bool = False
) -> LlmClient:
    """Build the configured client. ``provider``/``model`` override the env
    settings, so eval runs can compare models without editing .env.

    ``interactive`` is for calls a user is waiting on (search summaries): it
    gives up after one quick retry instead of backing off for minutes on a
    rate limit the way batch jobs (ingestion, classification) can afford to.
    """
    from app import config

    provider = (provider or config.LLM_PROVIDER).lower()
    rpm = config.LLM_MAX_RPM
    timeout = config.LLM_TIMEOUT_S
    retry: dict[str, Any] = {}
    if interactive:
        timeout = min(timeout, 30.0)
        retry = {"max_attempts": 2, "backoff_cap_s": 3.0}

    if provider == "gemini":
        return GeminiClient(
            api_key=config.GEMINI_API_KEY,
            model=model or config.GEMINI_MODEL,
            max_rpm=rpm,
            timeout_s=timeout,
            **retry,
        )
    if provider == "groq":
        return GroqClient(
            base_url=config.GROQ_BASE_URL,
            api_key=config.GROQ_API_KEY,
            model=model or config.GROQ_MODEL,
            reasoning_effort=config.GROQ_REASONING_EFFORT,
            max_completion_tokens=config.GROQ_MAX_COMPLETION_TOKENS,
            max_rpm=rpm,
            timeout_s=timeout,
            **retry,
        )
    raise LlmClientError(f"Unknown LLM_PROVIDER: {provider} (expected gemini or groq)")
