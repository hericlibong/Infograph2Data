# Stage 1: build frontend
FROM node:20-alpine AS builder
WORKDIR /app/frontend
# Copy frontend sources
COPY frontend/package*.json ./
COPY frontend/. ./
# Install dependencies and build
RUN if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi
RUN npm run build --silent

# Stage 2: runtime
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1

# Install system deps required for image processing / PDF tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend ./backend
COPY demo_assets ./demo_assets

# Copy built frontend from the builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
