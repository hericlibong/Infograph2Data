# Infograph2Data — Architecture Blueprint

> Locked: 2026-02-05

---

## A) Project Understanding

- **Goal**: Build a web app that extracts structured data (CSV/JSON) from visual sources (infographics, charts, screenshots, PDF pages).
- **Human-in-the-loop value**: Users review and correct extracted data before export—ensuring accuracy, building trust, and handling edge cases AI misses.
- **Demo success**: Upload a PDF/image → select region or page → see extracted table/facts → edit if needed → download clean CSV/JSON with provenance metadata.

---

## B) Modular Repo Structure

```
infograph2data/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI entrypoint
│       ├── config.py            # Settings (Pydantic BaseSettings)
│       ├── routers/
│       │   ├── health.py        # GET /health
│       │   ├── upload.py        # POST /upload
│       │   ├── extraction.py    # POST /extract, GET /jobs/{id}
│       │   ├── review.py        # GET/PUT /datasets/{id}
│       │   └── export.py        # GET /export/{id}
│       ├── services/
│       │   ├── storage.py       # File I/O abstraction
│       │   ├── extractor.py     # Orchestrates extraction strategies
│       │   ├── ocr.py           # Tesseract/EasyOCR wrapper
│       │   ├── pdf.py           # PDF page rendering + text layer
│       │   └── vision_llm.py    # LLM-based extraction (optional)
│       ├── schemas/
│       │   ├── upload.py        # UploadResponse, FileMetadata
│       │   ├── dataset.py       # DatasetRow, DatasetPatch
│       │   └── export.py        # ExportRequest, ExportManifest
│       ├── models/
│       │   └── dataset.py       # Internal Dataset object (not ORM)
│       └── storage/             # Runtime uploads (gitignored)
├── frontend/                    # Vite/React (future)
├── docs/
│   ├── devlog.md                # Append-only development log
│   └── architecture.md          # This blueprint
├── exports/                     # Generated export ZIPs (gitignored)
├── demo_assets/                 # Sample PDFs/images for testing
├── .env.example                 # Template for secrets
├── .gitignore
├── pyproject.toml               # Dependencies + tooling
└── README.md
```

### Why This Structure?

| Directory | Purpose | Workflow Stage |
|-----------|---------|----------------|
| `routers/upload.py` | Accept files, validate, store | **Import** |
| `routers/extraction.py` | Trigger extraction, select scope | **Scope + Extract** |
| `services/extractor.py` | Strategy dispatcher (PDF/OCR/LLM) | **Extract** |
| `routers/review.py` | CRUD on extracted dataset | **Review** |
| `routers/export.py` | Package final output | **Export** |
| `schemas/` | Pydantic models for API contracts | All stages |
| `services/storage.py` | Decouple file system from logic | All stages |

This mirrors the user workflow: **Import → Scope → Extract → Review → Export**.

---

## C) Phased Development Plan

### Phase 1: Setup (Foundation)
**Goal**: Runnable app, health check, docs initialized, git hygiene.

| Output | Description |
|--------|-------------|
| `backend/app/main.py` | FastAPI app with `/health` |
| `pyproject.toml` | Dependencies: `fastapi`, `uvicorn`, `python-multipart` |
| `docs/devlog.md` | First entry with setup commands |
| `.gitignore` | Ignore `.venv/`, `storage/`, `exports/`, `.env` |
| `.env.example` | Placeholder for future secrets |
| CORS config | Allow `localhost:5173` (Vite default) |

**Validation**: `uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001` returns 200 on `/health`.

---

### Phase 2: MVP Scaffolding (Upload + Dataset Object)
**Goal**: Accept file uploads, persist to disk, return dataset stub.

| Output | Description |
|--------|-------------|
| `POST /upload` | Accept PDF/PNG/JPG, store in `storage/` |
| `GET /files/{id}` | Retrieve file metadata |
| `Dataset` model | In-memory object: `id`, `source_file`, `rows[]`, `status` |
| `storage.py` | Save/load files with UUID naming |

**Validation**: Upload a PDF, get back `{ "id": "...", "filename": "...", "status": "pending" }`.

---

### Phase 3: Extraction Logic
**Goal**: Implement at least one extraction strategy; add scope selection.

| Output | Description |
|--------|-------------|
| `POST /extract` | Params: `file_id`, `strategy`, `page_range` (optional), `bbox` (optional) |
| `pdf.py` | Render PDF pages to images, extract native text |
| `ocr.py` | Run Tesseract/EasyOCR on image regions |
| `vision_llm.py` (optional) | Call GPT-4V / Claude Vision for complex charts |
| `GET /jobs/{id}` | Poll extraction status |
| Calibration support | User-assisted axis calibration (X-min/X-max/Y-min/Y-max) for charts |

**Validation**: Extract a table from a demo PDF; return JSON rows.

---

### Phase 4: Review + Export
**Goal**: Let users edit extracted data, then export with provenance.

| Output | Description |
|--------|-------------|
| `GET /datasets/{id}` | Return extracted rows for review UI |
| `PUT /datasets/{id}` | Accept user corrections |
| `GET /export/{id}` | Generate ZIP: `data.csv`, `data.json`, `manifest.json` |
| `manifest.json` | Provenance: source file, strategy used, edit history |

**Validation**: Edit a row via API, export ZIP, verify manifest includes edit timestamp.

---

## D) Extraction Strategy Analysis

| Strategy | Pros | Cons | Complexity | Reliability | Demo Ready? |
|----------|------|------|------------|-------------|-------------|
| **Pure PDF extraction** | Fast, no dependencies, preserves text fidelity | Only works if PDF has text layer; ignores images/charts | Low | High (when applicable) | ✅ Yes |
| **OCR-based** | Works on scanned docs, images, screenshots | Slower, needs Tesseract/EasyOCR, prone to layout errors | Medium | Medium | ✅ Yes |
| **Vision LLM** | Handles complex infographics, understands context | Requires API key, latency, cost, rate limits | Medium | Variable (model-dependent) | ⚠️ Risky for demo |

### Recommendation

**Fastest path to demo**: **Hybrid PDF + OCR**
1. Try native PDF text extraction first (PyMuPDF).
2. Fall back to OCR if text layer is empty or confidence is low.
3. Vision LLM as optional "smart mode" behind a feature flag.

**Fallback plan**: If OCR quality is poor on demo day, pre-process demo assets to ensure clean inputs, or hardcode a "demo mode" that uses cached results.

### Demo Priority (Confirmed)

If time is short: **polished end-to-end flow (upload → review/edit → export) first**; extra extraction strategies second.

---

## E) Documentation Protocol (`docs/devlog.md`)

### Entry Structure

```markdown
## [YYYY-MM-DD] Title

### Context
Why this change was needed.

### Commands
```bash
# Exact terminal commands (copy-paste friendly)
pip install fastapi uvicorn
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```

### Expected Output
```
INFO:     Uvicorn running on http://127.0.0.1:8001
```

### Decisions
- Chose X over Y because Z.

### Assumptions
- Assumed A is true; revisit if B happens.

### Next Steps
- [ ] Task 1
- [ ] Task 2
```

### Rules
1. **Append-only**: Never delete entries; strike-through if obsolete.
2. **Commands first**: Every entry must have runnable commands.
3. **No secrets**: Use `$VARIABLE` placeholders, reference `.env.example`.

---

## F) Assumptions + Decisions

### Assumptions
1. **No database needed for MVP**: In-memory + filesystem storage is sufficient for hackathon scope.
2. **Single-user mode**: No auth, no concurrent session handling.
3. **Export format priority**: CSV first, JSON second; ZIP packaging for provenance.
4. **Demo assets provided**: Sample PDFs/images will be added to `demo_assets/`.
5. **LLM API key optional**: Vision LLM is a stretch goal, not blocking.

### Decisions (from Q&A)

| Question | Decision |
|----------|----------|
| Chart calibration | User-assisted axis calibration (click X-min/X-max/Y-min/Y-max); auto-detection optional later |
| Extraction granularity | Support optional bbox regions; page-level is enough for first demo |
| Demo priority | Polished end-to-end flow first; multiple strategies second |
