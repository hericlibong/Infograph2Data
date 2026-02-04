# Infograph2Data

Minimal backend scaffold for a hackathon app.

## Setup

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Run backend

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```

## Test health endpoint

In another terminal:

```bash
curl http://127.0.0.1:8001/health
```

Expected:

```json
{"status":"ok"}
```
