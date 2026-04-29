"""Qwen3 ASR transcription via ModelScope Gradio demo.

Reads an audio file path with `-f <path>` and prints the transcription to stdout.
Designed to be invoked from Claudy's telegram.ts.

Notes:
- The public ModelScope demo can take a while to respond. We bump httpx's timeout
  to 10 minutes so the gradio_client doesn't bail at the default 60s window.
- We try a few common api_name endpoints because the demo occasionally renames
  them. Whichever returns text wins.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

import httpx
from gradio_client import Client, handle_file


SPACE = os.environ.get("CLAUDY_QWEN_ASR_SPACE", "Qwen/Qwen3-ASR-Demo")
HTTP_TIMEOUT_S = float(os.environ.get("CLAUDY_QWEN_ASR_HTTP_TIMEOUT", "600"))
API_CANDIDATES = [
    os.environ.get("CLAUDY_QWEN_ASR_API"),
    "/transcribe",
    "/predict",
    "/run",
    "/asr",
    "/process_audio",
]


def extract_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("text", "transcript", "transcription", "result", "output"):
            text = extract_text(value.get(key))
            if text:
                return text
        try:
            return json.dumps(value, ensure_ascii=False)
        except Exception:
            return str(value)
    if isinstance(value, (list, tuple)):
        for item in value:
            text = extract_text(item)
            if text:
                return text
        return ""
    return str(value).strip()


def call_predict(client: Client, audio_path: str) -> Any:
    audio = handle_file(audio_path)
    last_err: Exception | None = None

    for api_name in [n for n in API_CANDIDATES if n]:
        try:
            return client.predict(audio, api_name=api_name)
        except TypeError:
            try:
                return client.predict(audio=audio, api_name=api_name)
            except Exception as exc:
                last_err = exc
                continue
        except Exception as exc:
            last_err = exc
            continue

    try:
        return client.predict(audio)
    except Exception as exc:
        last_err = exc

    if last_err:
        raise last_err
    raise RuntimeError("No api_name worked for the Gradio demo.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Qwen3 ASR transcription")
    parser.add_argument("-f", "--file", required=True, help="Audio file path")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Audio file not found: {args.file}", file=sys.stderr)
        return 2

    timeout = httpx.Timeout(HTTP_TIMEOUT_S, connect=30.0)
    client = Client(SPACE, httpx_kwargs={"timeout": timeout}, verbose=False)

    try:
        result = call_predict(client, args.file)
    except httpx.ReadTimeout:
        print(
            "El demo publico de Qwen ASR tardo demasiado en responder. "
            "Sube CLAUDY_QWEN_ASR_HTTP_TIMEOUT (segundos) o reintenta cuando este menos saturado.",
            file=sys.stderr,
        )
        return 3
    except Exception as exc:
        print(f"Gradio client error: {exc}", file=sys.stderr)
        return 1

    text = extract_text(result)
    if not text:
        print(f"Empty transcription. Raw result: {result!r}", file=sys.stderr)
        return 4

    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
