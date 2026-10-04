from __future__ import annotations

import json
import time
from typing import Any, Protocol

import httpx


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

_MAX_ATTEMPTS = 5
_BACKOFF_BASE_S = 2.0
_BACKOFF_CAP_S = 60.0


class LlmClientError(RuntimeError):
    pass


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


def _retry_after_seconds(response: httpx.Response, attempt: int) -> float:
    header = response.headers.get("Retry-After")
    if header:
        try:
            return min(float(header), _BACKOFF_CAP_S)
        except ValueError:
            pass
    return min(_BACKOFF_BASE_S * (2 ** attempt), _BACKOFF_CAP_S)


class _BaseHttpClient:
    def __init__(self, model: str, max_rpm: int, timeout_s: float):
        self.model = model
        self._limiter = _RateLimiter(max_rpm)
        self._client = httpx.Client(timeout=timeout_s)

    def _post(self, url: str, json_body: dict, headers: dict | None = None) -> dict:
        last_error: Exception | None = None
        for attempt in range(_MAX_ATTEMPTS):
            self._limiter.wait()
            try:
                response = self._client.post(url, json=json_body, headers=headers)
            except httpx.HTTPError as exc:
                last_error = exc
                time.sleep(min(_BACKOFF_BASE_S * (2 ** attempt), _BACKOFF_CAP_S))
                continue

            if response.status_code == 429 or response.status_code >= 500:
                last_error = LlmClientError(
                    f"HTTP {response.status_code}: {response.text[:300]}"
                )
                if attempt < _MAX_ATTEMPTS - 1:
                    time.sleep(_retry_after_seconds(response, attempt))
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
        self, api_key: str, model: str, max_rpm: int = 10, timeout_s: float = 60.0
    ):
        if not api_key:
            raise LlmClientError("GEMINI_API_KEY is not set")
        super().__init__(model, max_rpm, timeout_s)
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


class OpenAiCompatibleClient(_BaseHttpClient):
    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        max_rpm: int = 10,
        timeout_s: float = 60.0,
    ):
        super().__init__(model, max_rpm, timeout_s)
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def complete_json(
        self, system: str, user: str, response_schema: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"{self._base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        def call(user_text: str) -> str:
            body = {
                "model": self.model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_text},
                ],
                "response_format": {"type": "json_object"},
            }
            envelope = self._post(url, body, headers=headers)
            try:
                return envelope["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as exc:
                raise LlmClientError(
                    f"Unexpected response shape: {str(envelope)[:300]}"
                ) from exc

        return _parse_with_repair(call, user)


def _parse_with_repair(call, user: str) -> dict[str, Any]:
    text = call(user)
    try:
        return json.loads(text)
    except json.JSONDecodeError as first_error:
        repair_user = (
            f"{user}\n\n"
            f"Your previous reply could not be parsed as JSON "
            f"({first_error}). Reply with ONLY a single valid JSON object, no "
            f"markdown fences or prose."
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


def create_llm_client() -> LlmClient:
    from app import config

    provider = config.LLM_PROVIDER.lower()
    rpm = config.LLM_MAX_RPM
    timeout = config.LLM_TIMEOUT_S

    if provider == "gemini":
        return GeminiClient(
            api_key=config.GEMINI_API_KEY,
            model=config.GEMINI_MODEL,
            max_rpm=rpm,
            timeout_s=timeout,
        )
    if provider == "mistral":
        return OpenAiCompatibleClient(
            base_url=config.MISTRAL_BASE_URL,
            api_key=config.MISTRAL_API_KEY,
            model=config.MISTRAL_MODEL,
            max_rpm=rpm,
            timeout_s=timeout,
        )
    if provider == "groq":
        return OpenAiCompatibleClient(
            base_url=config.GROQ_BASE_URL,
            api_key=config.GROQ_API_KEY,
            model=config.GROQ_MODEL,
            max_rpm=rpm,
            timeout_s=timeout,
        )
    if provider == "ollama":
        return OpenAiCompatibleClient(
            base_url=config.OLLAMA_BASE_URL,
            api_key="",
            model=config.OLLAMA_MODEL,
            max_rpm=rpm,
            timeout_s=timeout,
        )
    raise LlmClientError(f"Unknown LLM_PROVIDER: {config.LLM_PROVIDER}")
