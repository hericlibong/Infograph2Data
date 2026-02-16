# 📊 Infograph2Data

> **Unlock the data trapped in your pixels.**
> Turn static infographics, charts, and reports into actionable, structured data using Vision LLMs.

[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Live%20Demo-blue)](https://huggingface.co/spaces/ricolajazz/Infograph2Data-Demo)
[![Python](https://img.shields.io/badge/Python-3.12+-yellow.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Vite-blue)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Live Demo

Don't want to install anything? Try the app directly in your browser:
👉 **[Access the Live Demo on Hugging Face Spaces](https://ricolajazz-infograph2data-demo.hf.space/)**

*(Note: The extraction flow may require an OpenAI API Key for the LLM-based extraction.)*

---

## 📖 The Story

**"Data is everywhere, but often trapped in images."**

As a former journalist turned developer, I realized how much valuable information is locked inside static charts, PDF reports, and infographics. Extracting this data manually is tedious, error-prone, and slow.

**Infograph2Data** was created during a Hackathon to solve this specific problem. By leveraging Vision-capable LLMs (via the OpenAI SDK), this tool acts as a bridge between visual information and structured analysis. It "sees" the chart, understands its context, and extracts the raw numbers for you.

## ✨ Key Features

* **🔍 Automatic Identification:** Upload an image or PDF, and the AI automatically detects the chart type (Bar, Line, Pie, Scatter, etc.) and its context.
* **📊 Intelligent Extraction:** Converts visual elements (bars, lines, slices) into precise numerical data points.
* **📝 Interactive Review:** Don't blindly trust the AI. Review and edit the extracted data in a spreadsheet-like interface before exporting.
* **📄 PDF Support:** Handles multi-page PDF reports, processing them page by page.
* **💾 Flexible Export:** Download your clean data in **CSV**, **Excel**, or **JSON** formats ready for analysis in Python, R, or Tableau.

## 🛠️ Tech Stack

This project is built with a modern, production-ready stack:

* **Backend:**
    * **FastAPI:** High-performance async Python framework.
    * **OpenAI (openai Python SDK):** Vision-capable LLM used for extraction.
    * **PyMuPDF:** PDF parsing and rendering.
    * **Pydantic:** Robust data validation.
* **Frontend:**
    * **React (Vite):** Fast and reactive UI.
    * **TypeScript:** Type-safe development.
    * **TailwindCSS + shadcn/ui:** Clean and accessible design.
* **DevOps:**
    * **Docker:** Containerized for consistent deployment.
    * **Hugging Face Spaces:** Cloud hosting platform.

---

## ⚡ Installation & Usage

You can run **Infograph2Data** locally using Docker (Recommended) or manually.

### Prerequisites
* **Docker Desktop** (for the Docker option).
* An **OpenAI API Key** (GPT-4 Vision access) if you plan to use the LLM extraction.

### Option A: Quick Start with Docker 🐳

1.  **Clone the repository**
    ```bash
    git clone https://github.com/hericlibong/Infograph2Data.git
    cd Infograph2Data
    ```

2.  **Configure Environment**
    Create a `.env` file at the root of the project:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and paste your API Key:
    ```ini
    OPENAI_API_KEY=sk-your-api-key-here
    ```

3.  **Run the App**
    ```bash
    docker build -t infograph2data .
    docker run -p 7860:7860 --env-file .env infograph2data
    ```

4.  **Access**
    Open your browser at `http://localhost:7860` (the backend serves the React build and the API).

> Docker notes: the Dockerfile starts Uvicorn on port 7860 (CMD: `uvicorn backend.app.main:app --host 0.0.0.0 --port 7860`), so the container exposes 7860.

### Option B: Manual Setup (Dev Mode)

<details>
<summary>Click to expand manual instructions</summary>

#### Backend
```bash
# from project root
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r ../requirements.txt

# Run from project root:
# uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
# Or from backend/ directory:
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Access the frontend dev server at `http://localhost:5173`.

</details>

🧪 Testing

The project includes a comprehensive test suite.

**Backend Tests (Pytest):**
```bash
# Runs unit and integration tests from project root
pytest tests/
```

**Frontend Tests (Vitest):**
```bash
cd frontend
npm run test
```


## 📂 Project Structure

```
Infograph2Data/
├── backend/            # FastAPI Application
│   ├── app/
│   │   ├── routers/    # API Endpoints (Upload, Extract, Review...)
│   │   ├── services/   # Business Logic (Vision, PDF, Storage)
│   │   └── schemas/    # Pydantic Models
│   └── main.py         # Entry point (serves frontend + API)
├── frontend/           # React Application (Vite)
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application screens
│   │   └── api/        # API Client
├── tests/              # Backend Tests (E2E, Integration, Unit)
├── demo_assets/        # Sample images for testing
├── Dockerfile          # Production Docker build
└── docs/               # Project documentation & DevLog
```


## 🗺️ Roadmap & Status

This project is currently in Beta (MVP Phase).

- [x] Core Upload & Vision Extraction Pipeline
- [x] Interactive Data Editor (Handsontable)
- [x] Excel/CSV Export
- [x] Docker & Hugging Face Deployment
- [ ] Next: Batch processing for large datasets
- [ ] Next: Support for local Vision Models (LLaVA)
- [ ] Next: Direct connector to Google Sheets/Notion


## ✅ Server & Architecture verification

- The backend `backend/app/main.py` registers API routers under the `/api` prefix; API endpoints are available at paths like `/api/health`, `/api/files`, `/api/extract`, etc.
- The application serves the React build from `frontend/dist` and mounts static assets at `/assets`.
- A catch-all route returns `index.html` for frontend routes and avoids serving index for API/static paths (requests starting with `api`, `files`, `extract`, `health` are excluded), preventing the frontend from swallowing API requests.
- Docker image exposes port `7860` and the Uvicorn command in the Dockerfile starts the app on port `7860`; local development commonly uses `8001` for uvicorn as documented above.


## 👤 Author

Heric

Developer & Data Journalism Enthusiast

GitHub: https://github.com/hericlibong
