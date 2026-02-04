from fastapi import FastAPI

app = FastAPI(title="Infograph2Data")


@app.get("/health")
def health():
    return {"status": "ok"}
