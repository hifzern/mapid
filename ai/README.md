# AI Insight Service

This FastAPI service receives verified aggregate values only. It never receives route geometry or raw competition data.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r ai/requirements.txt
uvicorn ai.app:app --reload
python -m pytest ai
```

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and the same `AI_SERVICE_TOKEN` used by the Next.js server. On Render, start with `uvicorn ai.app:app --host 0.0.0.0 --port $PORT` and use `/health` for the health check.

Provider failures, invalid structured output, or unsupported numbers return a deterministic Indonesian template instead of blocking the spatial result.
