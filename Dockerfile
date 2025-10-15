###############################
# Stage 1: Build React client #
###############################
FROM node:20-slim AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

#################################
# Stage 2: Python API + frontend #
#################################
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

# Copy backend code
COPY orgchart_app /app

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy React build into a known folder for Flask to serve
COPY --from=client-build /client/build /app/frontend

# Optional: seed at runtime is handled by start command in Render; keep image lean

EXPOSE 7860

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:7860", "wsgi:app"]
