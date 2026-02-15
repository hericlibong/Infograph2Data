# Infograph2Data — Prompts History

> Complete record of all prompts sent during the development of this project.
> Each prompt is documented with its phase, type (request/validation), and exact content.

---

## Table of Contents

1. [Pre-Phase: Architecture Blueprint Request](#1-pre-phase-architecture-blueprint-request)
2. [Phase 1: Foundation — Validation + Implementation Request](#2-phase-1-foundation--validation--implementation-request)
3. [Phase 2: Upload + Storage — Validation + Request](#3-phase-2-upload--storage--validation--request)
4. [Phase 3: Scope + Extraction — Validation + Request](#4-phase-3-scope--extraction--validation--request)
5. [Phase 4: Review + Export — Validation + Request](#5-phase-4-review--export--validation--request)
6. [Test Suite: Plan Request (No Implementation)](#6-test-suite-plan-request-no-implementation)
7. [Test Suite: Plan Update Request](#7-test-suite-plan-update-request)
8. [Test Suite: Implementation Validation](#8-test-suite-implementation-validation)
9. [Phase 5: Vision LLM Extraction — Plan Request](#9-phase-5-vision-llm-extraction--plan-request)

---

## 1. Pre-Phase: Architecture Blueprint Request

**Type:** Initial Request  
**Phase:** Pre-implementation (Architecture Design)  
**Date:** 2026-02-05

### Prompt

```
Role
You are AC, the lead engineering copilot for a hackathon project. Your job is to propose a clean, modular, and scalable architecture and development strategy for a Python/FastAPI backend.

Project
Name: Infograph2Data
Goal: Build a web app that turns visual data (infographics, charts, screenshots, PDF pages) into structured data (CSV/JSON), with a Human-in-the-loop review step before export.

Context (current state)
- The repository is currently EMPTY (clean slate).
- A local virtual environment already exists at .venv (do not recreate it).
- The frontend is Vite/React (ignore for now, but keep future CORS needs in mind).

Non-negotiable constraints
1) Backend framework: FastAPI (Python 3.12).
2) Strict run command (must work exactly like this):
   uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
3) Security: never commit secrets; if needed, provide a .env.example.
4) Documentation: maintain a dynamic, append-only log at:
   docs/devlog.md
   This log must be copy/paste friendly and must include exact terminal commands.

Current mission (IMPORTANT)
Do NOT write implementation code yet.
I only want a high-level blueprint, a repo structure proposal, and a development strategy.

Deliverables (what you must output)
A) Project understanding (3 bullets)
- Restate the goal
- Restate the Human-in-the-loop value proposition
- Restate what "success" looks like for a demo

B) Modular repo structure
- Propose a directory tree rooted at:
  backend/ frontend/ docs/ exports/ demo_assets/
- For the backend, propose a clean internal structure (example: app/, routers/, services/, schemas/, storage/)
- Explain briefly WHY you chose this structure and how it maps to the user workflow:
  Import → Scope → Extract → Review → Export

C) Phased development plan (4 phases)
Create 4 phases with a short description + concrete outputs for each phase:
1) Setup (run, health endpoint, docs, git hygiene)
2) MVP scaffolding (upload + storage + basic dataset object)
3) Extraction logic (PDF page selection, OCR/facts extraction, optional chart digitization via calibration)
4) Review + export (edit/confirm, export pack ZIP with provenance + recipe)

D) Extraction strategy analysis (table)
Compare 3 strategies:
1) Pure PDF extraction
2) OCR-based extraction
3) Vision LLM extraction
For each: Pros, Cons, Complexity, Reliability, Demo readiness.
Then recommend the fastest path to a demoable product AND a fallback plan if the best option fails.

E) Documentation protocol (docs/devlog.md)
Explain exactly how you want to use docs/devlog.md:
- What sections each entry contains
- How to record commands and expected outputs
- How to log decisions and assumptions

F) Assumptions + 3 questions max
List your assumptions.
If needed, ask up to 3 questions (max) that unblock the plan.

Output style
Structured, technical, pedagogical. Use Markdown headings, lists, and at least one table. No fluff. No code.
```

---

## 2. Phase 1: Foundation — Validation + Implementation Request

**Type:** Validation + Implementation Request  
**Phase:** Phase 1 (Foundation)  
**Date:** 2026-02-05

### Prompt

```
AC — Approved. Proceed with implementation now.

Scope for this run:
- Start with the foundation (runnable backend + docs + git hygiene). Keep changes focused.

Notes (keep creative freedom):
- Keep the architecture you proposed (routers/services/schemas). No database, filesystem storage is fine.
- Use CORS for the future frontend (localhost:5173), but don't spend time wiring the frontend yet.

IMPORTANT documentation requirement:
1) Copy your full blueprint (repo tree + all tables + phases + strategy table + devlog protocol + assumptions/questions) into:
   - docs/architecture.md
2) Also append a short "Architecture locked" entry to docs/devlog.md with:
   - the run command (port 8001)
   - what files were created
   - how to verify /health

Answers to your 3 questions (so you can move forward):
1) Chart calibration: YES, user-assisted axis calibration (click X-min/X-max/Y-min/Y-max) is preferred; auto-detection is optional later.
2) Extraction granularity: Support optional regions (bbox) but page-level is enough for the first working demo.
3) Demo priority if time is short: polished end-to-end flow (upload → review/edit → export) first; extra strategies second.

Go ahead and implement the foundation now. At the end, list modified files + exact commands to run and verify.
```

---

## 3. Phase 2: Upload + Storage — Validation + Request

**Type:** Validation + Implementation Request  
**Phase:** Phase 2 (Upload + Storage)  
**Date:** 2026-02-05

### Prompt

```
✅ Phase 1 validated.

You can start Phase 2 (Upload + storage) now.

Requirements:
- Keep the run command unchanged: `uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001`
- No DB, filesystem storage only (gitignored).
- After Phase 2, update `docs/devlog.md` (append-only, include exact commands + expected outputs).
- Also copy the Phase 2 plan + API contracts + any tables into a dedicated file: `docs/phase_2_plan.md` (create it if missing).

Deliverable for Phase 2:
- `POST /files` multipart upload (PDF/PNG/JPG) → returns `file_id`, `filename`, `mime`, `pages` (if PDF), `created_at`
- Store file under `backend/app/storage/` (or configured storage dir via env)
- Minimal `GET /files/{id}` metadata endpoint (if quick)
- Provide curl commands to test both endpoints.

Go ahead.
```

---

## 4. Phase 3: Scope + Extraction — Validation + Request

**Type:** Validation + Implementation Request  
**Phase:** Phase 3 (Scope + Extraction)  
**Date:** 2026-02-05

### Prompt

```
✅ Phase 2 validated. Good job (upload + storage + metadata + list + tests + devlog + phase_2_plan).

You can start Phase 3 (Scope + Extraction logic).

Constraints (unchanged):
- Keep the exact run command: `uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001`
- No database (filesystem only), no secrets committed.

Phase 3 deliverables (focus "demoable + useful"):
1) **Scope support for PDFs**
   - Add a page preview endpoint so the frontend can display a PDF page as an image.
   - Suggested:
     - `GET /files/{id}/pages` → {id, pages, …}
     - `GET /files/{id}/pages/{page}/preview?scale=2` → returns PNG bytes (or JPEG) with correct content-type

2) **Extraction job API**
   - `POST /extract` → starts an extraction job
     - Input: `file_id`, `page` (required for PDF), optional `bbox` (x,y,w,h or x1,y1,x2,y2), optional `strategy` (default `auto`)
     - Output: `job_id`, `dataset_id`, `status`
   - `GET /jobs/{job_id}` → status polling + basic logs/errors

3) **Minimum extraction strategy**
   - Implement `auto` strategy:
     - If PDF has usable text layer → extract structured rows (even a simple first-pass table/kv extraction is OK for demo)
     - Else → either return a clear "needs OCR/vision" message OR (optional) enable a Vision LLM mode behind an env flag if API key exists.
   - Store extracted dataset on disk (gitignored), e.g. `backend/app/storage/datasets/{dataset_id}.json`

4) **Docs**
   - Append `docs/devlog.md` with exact commands + expected outputs (copy/paste friendly).
   - Create a dedicated file: `docs/phase_3_plan.md` containing:
     - endpoint contracts (request/response examples)
     - any tables/decisions
     - curl tests for preview + extract + job status

Please proceed.
```

---

## 5. Phase 4: Review + Export — Validation + Request

**Type:** Validation + Implementation Request  
**Phase:** Phase 4 (Review + Export)  
**Date:** 2026-02-06

### Prompt

```
Go ahead.✅ Phase 3 validated.

What's confirmed working:
- GET /files/{id}/pages
- GET /files/{id}/pages/{page}/preview (PNG)
- POST /extract + GET /jobs/{job_id}
- Table parsing verified on demo_assets/table_sample.pdf
- docs/devlog.md updated + docs/phase_3_plan.md created.

You can proceed to Phase 4 (Review + Export).

Constraints:
- Keep run command unchanged: uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
- No DB (filesystem only), no secrets committed.
- Append-only update in docs/devlog.md.
- Create a dedicated file docs/phase_4_plan.md (API contracts + tables + test curls).

Phase 4 expected deliverable (backend-only):
- GET /datasets/{dataset_id} -> returns extracted rows + columns + provenance
- PUT/PATCH /datasets/{dataset_id} -> apply user edits (track edit history)
- GET /export/{dataset_id} -> returns a ZIP (data.csv, data.json, manifest.json)
- Provide curl commands + expected outputs for each endpoint.
```

---

## 6. Test Suite: Plan Request (No Implementation)

**Type:** Planning Request (No Code)  
**Phase:** Testing  
**Date:** 2026-02-06

### Prompt

```
AC — Before we start the frontend, we need to lock the backend with a complete, well-documented test plan.

Mission (NO test implementation yet):
1) Propose a COMPLETE backend test plan (unit + integration), aligned with the current API and filesystem storage approach.
2) Be precise: for each test, explain what it proves, why it matters, the expected outcome, and what should be mocked vs not mocked.
3) Ensure tests will be documented inside their future test files (docstring or header comments), clearly stating the role of each test/module.

Constraints:
- No external services (no OCR/LLM calls).
- Tests must be deterministic, runnable locally, and clean up temp files.
- Prefer pytest + FastAPI TestClient (or httpx).

Deliverables requested (Markdown):
A) Test Strategy Overview
- Scope: what we test vs what we explicitly do not test (for now)
- Unit vs Integration vs End-to-End "happy path"
- How to handle filesystem storage in tests (tmp dir / storage override)

B) Test Matrix (table)
For each API/feature:
- Test ID
- Type (unit/integration/e2e)
- Target (endpoint/function)
- Scenario
- Expected result
- Fixtures needed
- Notes (cleanup, edge cases)

C) Documentation Protocol for tests
- What the header/docstring of each test module should contain
- Naming conventions
- Minimal "Given/When/Then" style for clarity (optional)

D) Optional: CI suggestion
- A minimal GitHub Actions job to run the tests (no coverage requirement yet)

Do not write test code until I validate your plan.
```

---

## 7. Test Suite: Plan Update Request

**Type:** Update Request (Requirements Addition)  
**Phase:** Testing  
**Date:** 2026-02-06

### Prompt

```
AC — Test plan received in docs/test_plan.md. Overall direction looks good.

Before you start implementing tests, please incorporate these acceptance requirements:

1) Terminal output must be detailed and "complete" when running tests:
   - verbose test names and statuses
   - clear summary (passed/failed/skipped) + percentage coverage
   - show which files are covered and which lines are missing

   Concretely, define the exact command(s) we will use, for example with:
   - pytest verbosity
   - coverage report in terminal with missing lines
   - optional slowest tests report

2) Coverage acceptance threshold: **minimum 80%** (line coverage).
   - Specify how we enforce it (pytest-cov fail-under)
   - Clarify any exclusions (e.g., __init__.py, generated files), if needed.

Now, please update the plan accordingly (still NO test code yet):
- Update docs/test_plan.md to include:
  - the final "Test Run Commands" section (local + CI)
  - the coverage policy (80% threshold + exclusions if any)
  - the exact terminal output expectations (what we should see)

After updating docs/test_plan.md, reply with:
- the final recommended command line(s) to run locally
- the CI command line
- a short checklist of what "passing" means (functional + coverage).
```

---

## 8. Test Suite: Implementation Validation

**Type:** Validation + Implementation Request  
**Phase:** Testing (Implementation)  
**Date:** 2026-02-06

### Prompt

```
Go ahead.✅ Test plan update validated.

The additions meet our requirements:
- Detailed terminal output (verbose, term-missing, durations)
- Coverage gate enforced: --cov-fail-under=80
- Clear pass criteria + CI command + junitxml
- Reasonable coverage exclusions

You can start implementing the tests now, following docs/test_plan.md strictly.

Rules while implementing:
- Keep tests deterministic (no external services).
- Use tmp storage override/fixtures, and clean up temp files.
- Update docs/devlog.md (append-only) with exact commands + expected outputs as you progress.
- If any test needs a deviation from the plan, stop and ask before changing scope.
```

---

## Summary

| # | Phase | Type | Key Decision/Outcome |
|---|-------|------|---------------------|
| 1 | Pre-Phase | Blueprint Request | Architecture designed, 4-phase plan created |
| 2 | Phase 1 | Validation + Go | Foundation implemented (FastAPI, CORS, health) |
| 3 | Phase 2 | Validation + Go | Upload + storage endpoints created |
| 4 | Phase 3 | Validation + Go | PDF preview + extraction logic implemented |
| 5 | Phase 4 | Validation + Go | Review + export (ZIP with provenance) completed |
| 6 | Testing | Plan Request | Test plan documented (66 tests planned) |
| 7 | Testing | Update Request | Coverage policy added (80% threshold) |
| 8 | Testing | Implementation Go | 93 tests implemented, 91.86% coverage achieved |
| 9 | Phase 5 | Plan Request | Vision LLM 2-step extraction workflow designed |

---

## 9. Phase 5: Vision LLM Extraction — Plan Request

**Type:** Planning Request  
**Phase:** Phase 5 (Vision LLM Extraction)  
**Date:** 2026-02-08

### Context

After completing Phases 1-4 (foundation, upload, extraction, review/export) and the test suite, evaluation revealed that the current extraction logic only works for PDFs with embedded text layers. The core value proposition — extracting data from infographics, charts, and screenshots — requires Vision LLM integration.

Sample files were provided in `demo_assets/` covering multiple use cases:
- PNG/JPG screenshots of charts and infographics
- Multi-page PDFs with embedded infographics
- Various chart types: bar, grouped bar, stacked bar, line, pie, KPI panels

### Prompt

```
AC — We need to implement Vision LLM extraction to fulfill the core value proposition.

Context:
- Current extraction only works for PDFs with text layers (table parsing).
- For infographics, charts, and image captures, we need Vision LLM (GPT-4o).
- Sample files provided in demo_assets/ for testing.

Use cases to support:
1) User captures a screenshot of a figure from an online article/document → gets PNG, JPG, or other image format → extract numeric data.
2) User uploads a multi-page PDF with infographics → select pages → extract data from each.

Requirements for the extraction workflow (TWO-STEP process):

STEP 1 — IDENTIFICATION:
- Vision LLM analyzes the image/page
- Detects all distinct visual elements (charts, tables, KPI panels, etc.)
- For each element, returns:
  - type (bar_chart, pie_chart, line_chart, table, kpi_panel, etc.)
  - title (if visible)
  - description
  - data_preview (estimated structure)
  - bbox (bounding box coordinates for frontend highlighting)
  - confidence score
  - warnings (if any accuracy concerns)
- User reviews the detection, can:
  - Select/deselect elements to extract
  - Modify title or type
  - Add a missed element (with manual bbox)
- User confirms before proceeding

STEP 2 — EXTRACTION:
- Vision LLM extracts structured data from confirmed elements
- Returns dataset(s) with columns + rows
- Option to merge multiple elements into a single dataset

Additional requirements:
- Granularity: Detect separate elements (e.g., 4 items in a dense infographic, not 1 merged item)
- Bbox: Return coordinates for each detected element
- User modifications: Allow both select/deselect AND modify title/type/add missing
- Dataset merge: Optional, user choice

Deliverables:
1) Create docs/phase_5_plan.md with:
   - Complete API contract (request/response for both steps)
   - Element type taxonomy
   - Vision LLM prompts (identification + extraction)
   - Implementation tasks
   - Error handling

2) Do NOT implement yet — plan only, await validation.

Constraints:
- Keep run command unchanged: uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
- API key via environment variable (OPENAI_API_KEY)
- No secrets committed (.env.example only)
- GPT-4o as the Vision LLM model
```

---

## Observations

### Prompt Patterns Used

1. **Structured Requirements**: Each prompt included clear deliverables, constraints, and expected outputs.
2. **Validation Gates**: Every phase required explicit validation ("✅ Phase X validated") before proceeding.
3. **Documentation-First**: Every phase required updating `docs/devlog.md` and creating phase-specific docs.
4. **Copy-Paste Friendly**: Commands and expected outputs were always requested in executable form.
5. **Incremental Complexity**: Phases built upon each other progressively.

### Constraints Maintained Throughout

- Run command: `uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001`
- No database (filesystem only)
- No secrets committed
- Append-only documentation in `docs/devlog.md`

---

*Document generated: 2026-02-06*
*Last updated: 2026-02-08*

---

## 10. Phase 6: Frontend Implementation — Plan Request + Validation

**Type:** Request + Validation  
**Phase:** Phase 6 (Frontend)  
**Date:** 2026-02-08

### Prompt (Request)

```
The backend Phase 5 (Vision LLM) is complete and merged to main.
We can now move to the frontend implementation.

Please propose your frontend implementation plan for Infograph2Data.

Context:
- Stack: Vite + React (as specified in the architecture)
- Backend API running on localhost:8001
- Full extraction workflow implemented: Upload → Identify → Confirm → Extract → Review → Export

Requirements:
- Complete user flow from upload to export
- Human-in-the-loop review step (edit extracted data before export)
- Visual display of detected elements with bounding boxes
- Support for granularity options (annotated_only, full, full_with_source)

Deliverables:
1) Proposed tech stack (styling, state management, UI components)
2) Page/route architecture
3) Phased implementation plan with time estimates
4) Folder structure proposal
5) Key technical considerations (bbox scaling, etc.)
6) Questions for clarification before starting
```

### Response (Validation + Technical Directives)

```
Your plan is excellent, validated for both structure and stack.

Here are my answers to your questions and my technical directives to get started:

    Design & UI Library: Use shadcn/ui (based on Radix + Tailwind). I want a 'SaaS Data Tool' look (Clean, minimalist, Inter font).

    State Management: Add Zustand. I need a global store useAppStore to hold the currentFileId, the currentStep (Upload > Identify > Review...), and the workflowOptions (granularity). Do not use 'Prop drilling'.

    Priority: Focus on the complete 'Happy Path'. We will refine error cases later.

Technical Watchpoints (F3 & F5):

    F3 (Identify): Watch out for Bounding Box scaling. The coordinates received from the backend correspond to the actual size of the image/PDF. The frontend will need to calculate the ratio to display them correctly on screen.

    F5 (Review): For the editable table, ensure you can handle cell coloring based on the source (annotated = green/solid, estimated = orange/warning).

Action: You may start Phase F1 (Setup). Initialize the project, install dependencies (including shadcn/ui, zustand, react-query), configure the proxy to port 8001, and create the folder structure.
```

---

## 11. Stabilization Session — Bug Fixes and Feature Request

**Type:** Bug Investigation + Feature Implementation  
**Phase:** Stabilization  
**Date:** 2026-02-10

### Context

User reported that the application was unstable and not ready for demo. Extraction was failing with various errors, and extracted data quality needed improvement.

### Prompt (User Request)

```
I don't want you to implement the export page yet, but I want you to help me fix the extraction 
problems and stabilize the application because we noticed it was very unstable and the data is 
not being extracted correctly. It's out of the question to present the app in this state. 
It's imperative to fix the problems. So I want you to examine the problems and propose a first 
solution. Then, I want you to create an "issues" folder where you will detail precisely the 
problem encountered (in English). If you manage to fix it, detail the solution, otherwise 
specify that it remains.
```

### Actions Taken

1. **Investigation**: Analyzed error logs, traced code paths, identified 4 distinct issues
2. **Issue Documentation**: Created `/issues` folder with detailed markdown files for each issue
3. **Bug Fixes**: Resolved 3 issues completely, documented 1 as partial (inherent LLM limitation)
4. **Testing**: Verified all 124 tests pass after fixes

### Outcome

- Issues 001-003: RESOLVED
- Issue 004: PARTIAL (documented with workarounds)
- Application now stable for extraction workflow

---

## 12. Source Filter Feature Request

**Type:** Feature Request  
**Phase:** Review Page Enhancement  
**Date:** 2026-02-10

### Prompt (User Request)

```
"granularity with annotated_only doesn't work as a parameter for extraction. It displays with 
the checkbox once the data is extracted on the review page but cannot be checked, so they 
cannot be selected for extraction after extraction either. So first, let's allow selecting 
annotated data. 

User story: when the user has been able to extract their data, they see the annotated data 
and those that are simply estimated when the dataviz are complex. The user must be able to 
display only the annotated or estimated data or both depending on their needs before export."
```

### Actions Taken

1. Created `SourceFilterBar` component with 3 filter options
2. Added filtering logic to `DatasetTable` component
3. Implemented row counts per source type
4. Added visual feedback for active filters

### Outcome

- Users can now filter between "All Data", "Annotated Only", "Estimated Only"
- Row counts displayed in filter buttons
- Seamless integration with existing Review page

---

## 13. Color Contrast Improvement Request

**Type:** UI/UX Improvement  
**Phase:** Review Page Styling  
**Date:** 2026-02-10

### Prompt (User Request)

```
Could you contrast the colors a bit more between annotated and estimated data because on a 
white background they are difficult to distinguish. Try to find a good compromise between 
the background and the text.
```

### Actions Taken

1. Updated cell styling with stronger backgrounds (`-100` instead of `-50`)
2. Added 4px left border as visual indicator
3. Applied dark text colors (`-900`) for contrast
4. Updated filter buttons and legend to match new color scheme
5. Switched from `orange` to `amber` palette for warmer tone

### Outcome

- Clear visual distinction between annotated (green) and estimated (amber) cells
- Consistent color scheme across all UI elements
- High contrast maintained on white backgrounds

---

## Summary Table (Updated)

| # | Phase | Type | Key Decision/Outcome |
|---|-------|------|---------------------|
| 1 | Pre-Phase | Blueprint Request | Architecture designed, 4-phase plan created |
| 2 | Phase 1 | Validation + Go | Foundation implemented (FastAPI, CORS, health) |
| 3 | Phase 2 | Validation + Go | Upload + storage endpoints created |
| 4 | Phase 3 | Validation + Go | PDF preview + extraction logic implemented |
| 5 | Phase 4 | Validation + Go | Review + export (ZIP with provenance) completed |
| 6 | Testing | Plan Request | Test plan documented (66 tests planned) |
| 7 | Testing | Update Request | Coverage policy added (80% threshold) |
| 8 | Testing | Implementation Go | 93 tests implemented, 91.86% coverage achieved |
| 9 | Phase 5 | Plan Request | Vision LLM 2-step extraction workflow designed |
| 10 | Phase 6 | Frontend Setup | Vite + React + Tailwind + Zustand configured |
| 11 | Stabilization | Bug Fixes | 4 issues identified, 3 resolved, 1 partial |
| 12 | Review Page | Feature | Source filter (annotated/estimated) implemented |
| 13 | Review Page | UI/UX | Color contrast improvement applied |
| 14 | Export Page | Feature | Export page implemented, workflow complete |

---

## 14. Export Page Implementation Request

**Type:** Feature Implementation  
**Phase:** Phase 6 (Frontend F6)  
**Date:** 2026-02-10

### Context

All frontend pages were implemented except the Export page. User requested to detail the implementation plan and then proceed with implementation.

### Prompt (User Request)

```
Could you detail the implementation plan. If everything is OK, we validate and you start.
```

### Plan Delivered

- Page structure with dataset summaries, format selector, download button
- API integration with `GET /export/{dataset_id}?formats=csv,json`
- Components: DatasetSummary, FormatSelector, DownloadButton
- Browser download trigger via Blob URL

### Prompt (Validation)

```
You can start the implementation.
```

### Actions Taken

1. Fixed `exportDataset()` function in `client.ts` (wrong endpoint)
2. Created `ExportPage.tsx` with full layout and functionality
3. Updated `App.tsx` to add ExportPage route
4. Removed unused function to fix TypeScript warning
5. Verified build passes

### Files Created/Modified

| File | Action |
|------|--------|
| `frontend/src/pages/ExportPage.tsx` | Created |
| `frontend/src/api/client.ts` | Modified (fixed endpoint) |
| `frontend/src/App.tsx` | Modified (added route) |

### Outcome

- Export page fully functional
- Complete user workflow: Upload → Identify → Select → Review → Export
- ZIP download with CSV, JSON, and manifest.json
- Frontend Phase 6 complete

---

## 15. Export Source Filter Bug Fix

**Type:** Bug Fix  
**Phase:** Issue 005  
**Date:** 2026-02-10

### Context

User reported that the source filter selection on Review page (Annotated Only / Estimated Only) was not being respected during export.

### Prompt (User Request)

```
I notice that the choice made in Review is not taken into account by the export. For example, 
a user who selects only annotated data in the Review phase, when they export they end up with 
both annotated and estimated data. Normally, they should export what they selected. If they 
select annotated data, they will only get annotated. If they only select estimated data, 
they will only get estimated data. If they select both, they will get both.

Can you create an issue and propose the solution to implement this?
```

### Actions Taken

1. Created Issue 005 with detailed analysis and implementation plan
2. After validation, implemented the solution:
   - Added `sourceFilter` to Zustand global store
   - Updated ReviewPage to use global store
   - Added `source_filter` query param to backend export endpoint
   - Updated frontend API client to pass filter
   - Updated ExportPage to display filter status

### Files Modified

| File | Changes |
|------|---------|
| `frontend/src/store/useAppStore.ts` | Added `SourceFilter` type and state |
| `frontend/src/pages/ReviewPage.tsx` | Use global store |
| `frontend/src/pages/ExportPage.tsx` | Display filter, pass to API |
| `frontend/src/api/client.ts` | Added `sourceFilter` param |
| `backend/app/routers/export.py` | Added `source_filter` param, row filtering |
| `issues/005_export_ignores_source_filter.md` | Created, then marked RESOLVED |

### Outcome

- Issue 005: RESOLVED
- Export now respects source filter selection
- User sees confirmation of filter on Export page
- All tests pass

---

## Summary Table (Updated)

| # | Phase | Type | Key Decision/Outcome |
|---|-------|------|---------------------|
| 1 | Pre-Phase | Blueprint Request | Architecture designed, 4-phase plan created |
| 2 | Phase 1 | Validation + Go | Foundation implemented (FastAPI, CORS, health) |
| 3 | Phase 2 | Validation + Go | Upload + storage endpoints created |
| 4 | Phase 3 | Validation + Go | PDF preview + extraction logic implemented |
| 5 | Phase 4 | Validation + Go | Review + export (ZIP with provenance) completed |
| 6 | Testing | Plan Request | Test plan documented (66 tests planned) |
| 7 | Testing | Update Request | Coverage policy added (80% threshold) |
| 8 | Testing | Implementation Go | 93 tests implemented, 91.86% coverage achieved |
| 9 | Phase 5 | Plan Request | Vision LLM 2-step extraction workflow designed |
| 10 | Phase 6 | Frontend Setup | Vite + React + Tailwind + Zustand configured |
| 11 | Stabilization | Bug Fixes | 4 issues identified, 3 resolved, 1 partial |
| 12 | Review Page | Feature | Source filter (annotated/estimated) implemented |
| 13 | Review Page | UI/UX | Color contrast improvement applied |
| 14 | Export Page | Feature | Export page implemented, workflow complete |
| 15 | Export | Bug Fix | Issue 005 resolved, filter respected in export |
| 16 | Review/Export | Bug Fix | Issues 007+008 resolved, edits persisted to backend |

---

## 16. Review Edits Persistence Bug Fix (Issues 007 + 008)

**Type:** Bug Fix  
**Phase:** Stabilization  
**Date:** 2026-02-11

### Context

Analysis revealed that user edits made on the ReviewPage were stored only in React local state and never sent to the backend. This caused two critical issues:

- **Issue 007**: Edits lost on page refresh
- **Issue 008**: Export downloaded unedited original data

### Prompt (User Request)

```
ok peux tu créer des issues pour y intégrer les bugs que tu as cités. Tous les bugs. Tu peux 
les intégrer 1 fichier à la suite de ceux qui sont déjà dans le dossier. Tu les écris en anglais. 
Une fois que c'est fait on va les régler un par un.
```

Then after issues were created:

```
ok allons tu peux corriger ces deux bugs. N'oublie pas de mettre à jour le README pour documenter 
la correction et le prompts_history de la docs.
```

### Actions Taken

1. Added `updateDataset()` function to `frontend/src/api/client.ts`
2. Modified `ReviewPage.tsx`:
   - Added debounced save (1 second delay after edit)
   - Added save status indicator (Saving... / Saved / Failed)
   - Added cleanup on component unmount
3. Updated issue files 007 and 008 to RESOLVED
4. Updated issues/README.md

### Files Modified

| File | Changes |
|------|---------|
| `frontend/src/api/client.ts` | Added `updateDataset()` function |
| `frontend/src/pages/ReviewPage.tsx` | Added debounced persistence + status indicator |
| `issues/007_review_edits_not_persisted.md` | Status: RESOLVED |
| `issues/008_export_ignores_frontend_edits.md` | Status: RESOLVED |
| `issues/README.md` | Updated status table |

### Technical Implementation

```typescript
// Debounced save after each edit (1 second delay)
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const persistDataset = useCallback(async (dataset: Dataset) => {
  setSaveStatus('saving');
  await updateDataset(dataset.dataset_id, {
    columns: dataset.columns,
    rows: dataset.rows,
  });
  setSaveStatus('saved');
}, []);

// In handleUpdateRow:
saveTimerRef.current = setTimeout(() => {
  persistDataset(updated[datasetIndex]);
}, 1000);
```

### Outcome

- Issues 007 and 008: RESOLVED
- User edits now persist to backend automatically
- Visual feedback shows save status (Saving.../Saved/Failed)
- Export correctly includes user corrections
- Frontend build passes

---

## Summary Table (Updated)

| # | Phase | Type | Key Decision/Outcome |
|---|-------|------|---------------------|
| 1 | Pre-Phase | Blueprint Request | Architecture designed, 4-phase plan created |
| 2 | Phase 1 | Validation + Go | Foundation implemented (FastAPI, CORS, health) |
| 3 | Phase 2 | Validation + Go | Upload + storage endpoints created |
| 4 | Phase 3 | Validation + Go | PDF preview + extraction logic implemented |
| 5 | Phase 4 | Validation + Go | Review + export (ZIP with provenance) completed |
| 6 | Testing | Plan Request | Test plan documented (66 tests planned) |
| 7 | Testing | Update Request | Coverage policy added (80% threshold) |
| 8 | Testing | Implementation Go | 93 tests implemented, 91.86% coverage achieved |
| 9 | Phase 5 | Plan Request | Vision LLM 2-step extraction workflow designed |
| 10 | Phase 6 | Frontend Setup | Vite + React + Tailwind + Zustand configured |
| 11 | Stabilization | Bug Fixes | 4 issues identified, 3 resolved, 1 partial |
| 12 | Review Page | Feature | Source filter (annotated/estimated) implemented |
| 13 | Review Page | UI/UX | Color contrast improvement applied |
| 14 | Export Page | Feature | Export page implemented, workflow complete |
| 15 | Export | Bug Fix | Issue 005 resolved, filter respected in export |
| 16 | Review/Export | Bug Fix | Issues 007+008 resolved, edits persisted to backend |
| 17 | Types | Bug Fix | Issue 006 resolved, HealthResponse type corrected |
| 18 | UX | Bug Fix | Issue 009 resolved, confirmation before reset |
| 19 | UX | Bug Fix | Issue 010 resolved, expiry handled with clear message |
| 20 | Planning | Phase 7 Plan | UX improvements plan created (10 tasks, 3 sprints) |
| 21 | Phase 7 | Sprint 1 | UX-1, UX-3, UX-4 implemented (step indicator, guards, back nav) |
| 22 | Phase 7 | Sprint 2 | UX-2, UX-5, UX-6 implemented (loading overlay, empty states, progress) |
| 23 | Phase 7 | Sprint 3 | UX-7 to UX-10 implemented (shortcuts, responsive, animations, persist) |
| 24 | Phase 8 | Test Plan | Frontend test plan created (43 tests, 6 phases) |

---

## 17. Deployment Preparation (Build & Serve Frontend)

**Date:** 2026-02-15

### Actions performed

- Updated frontend TypeScript config to exclude test files from the app build: `frontend/tsconfig.app.json` (added "exclude": ["src/test", "**/*.test.ts", "**/*.test.tsx", "src/setupTests.ts"]).
- Updated backend to serve React build from `frontend/dist` by importing and mounting StaticFiles and FileResponse and adding a catch-all route: `backend/app/main.py`.
- Fixed minor TypeScript warnings by removing unused imports in `frontend/src/components/EditableCell.tsx` and `frontend/src/pages/ReviewPage.tsx` to allow production build.
- Created deployment documentation at `docs/deployment.md` describing how to build the frontend and run the backend (uvicorn on port 7860) and notes for Docker/Hugging Face.
- Built the frontend successfully (`cd frontend && npm run build`), which produced `frontend/dist` with `index.html` and `assets/`.

### Files modified/created

- Modified: `frontend/tsconfig.app.json`
- Modified: `backend/app/main.py`
- Modified: `frontend/src/components/EditableCell.tsx`
- Modified: `frontend/src/pages/ReviewPage.tsx`
- Created: `docs/deployment.md`

### Verification commands run

- `cd frontend && npm run build` — completed with success; `dist/` generated.
- Suggested run to serve app: `uvicorn backend.app.main:app --host 0.0.0.0 --port 7860` (ensure `frontend/dist` exists in repo/image).

---

## 18. Docker Deployment Files & Branch

**Date:** 2026-02-15

### Actions performed

- Created branch `ops/deployment-huggingface` and committed Docker & deployment files.
- Generated `requirements.txt` from current virtualenv.
- Added `.dockerignore` and `Dockerfile` (multi-stage) at repo root.
- Ensured `frontend/dist` is included in the final image and backend serves it.

### Files created/modified

- Created: `Dockerfile`, `.dockerignore`, `requirements.txt`, `docs/deployment_docker.md`
- Modified: `docs/deployment.md`, `docs/prompts_history.md`

---

*Last updated: 2026-02-15*

### 18b. Branch pushed to remote

**Date:** 2026-02-15

- Branch `ops/deployment-huggingface` pushed to `origin`.


