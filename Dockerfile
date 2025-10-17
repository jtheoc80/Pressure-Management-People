###############################
# Stage 1: Build React client #
###############################
FROM node:20-slim AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
# Prefer reproducible installs; fall back to install if lock is out-of-sync
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

#################################
# Stage 2: Python API + frontend #
#################################
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

# Copy backend code
COPY orgchart_app /app

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy React build into a known folder for Flask to serve
COPY --from=client-build /client/build /app/frontend

# Optional: seed at runtime is handled by start command in Render; keep image lean

EXPOSE 10000

# Bind to Render's provided PORT when available, defaulting to 10000
CMD ["/bin/sh", "-lc", "gunicorn -w 2 -b 0.0.0.0:${PORT:-10000} wsgi:app"]
