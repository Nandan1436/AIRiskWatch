"""Loader for the prompt files in this package.

Every LLM prompt lives in a file under ``app/prompts/<feature>/`` so it can be
read and edited without touching code. Templates mark their inputs with
``{{name}}``; ``render`` fills them and fails loudly on a missing value.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

PROMPTS_DIR = Path(__file__).resolve().parent

_PLACEHOLDER_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")


@lru_cache(maxsize=None)
def load_text(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8").strip()


@lru_cache(maxsize=None)
def load_json(name: str) -> Any:
    with open(PROMPTS_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def render(name: str, **values: str) -> str:
    template = load_text(name)

    def substitute(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in values:
            raise KeyError(f"prompt {name!r} needs a value for {{{{{key}}}}}")
        return str(values[key])

    return _PLACEHOLDER_RE.sub(substitute, template)
