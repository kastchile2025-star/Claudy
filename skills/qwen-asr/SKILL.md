# qwen-asr

Skill local para transcribir audios usando el demo publico de Qwen3 ASR en ModelScope via Gradio client.

## Uso

```bash
python scripts/main.py -f /ruta/al/audio.oga
```

Imprime la transcripcion en stdout. Sale con codigo distinto de 0 si hay error.

## Variables de entorno opcionales

| Variable | Default | Descripcion |
|---|---|---|
| `CLAUDY_QWEN_ASR_SPACE` | `Qwen/Qwen3-ASR-Demo` | Space de Hugging Face / ModelScope a usar |
| `CLAUDY_QWEN_ASR_HTTP_TIMEOUT` | `600` | Timeout (segundos) de httpx contra el demo |
| `CLAUDY_QWEN_ASR_API` | `(auto)` | Forzar un `api_name` especifico (ej. `/transcribe`) |

## Dependencias

```bash
pip install gradio_client httpx
```

## Notas

- El demo publico puede saturarse. Si `httpx.ReadTimeout` sigue ocurriendo, sube
  `CLAUDY_QWEN_ASR_HTTP_TIMEOUT` o usa una alternativa local como `faster-whisper`.
- El script intenta varios `api_name` comunes (`/transcribe`, `/predict`, `/run`, `/asr`,
  `/process_audio`) porque el demo cambia el nombre cada cierto tiempo.
