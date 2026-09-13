# Aegis AI Reliability Gateway — production container.
#
# Vercel (where the Next.js frontend lives) cannot host a long-running Python
# process, so the gateway ships as its own container. Build and run:
#
#   docker build -t aegis-gateway .
#   docker run -p 8420:8420 \
#     -e GATEWAY_REQUIRE_AUTH=true \
#     -e GATEWAY_ADMIN_SECRET=$(openssl rand -hex 32) \
#     -v aegis-data:/data \
#     aegis-gateway
#
# Mount a volume at /data (see GATEWAY_DB_PATH below) so API keys and spend
# survive container restarts and redeploys — without it, the SQLite file
# lives in the container's writable layer and is lost on recreate.

FROM python:3.11-slim AS base

WORKDIR /app

# System deps: none required beyond what pip installs (FastAPI/uvicorn are
# pure-Python plus C extensions with prebuilt wheels for slim images).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# GATEWAY_DB_PATH overrides the default gateway/gateway_state.db location —
# point it at a mounted volume in production.
ENV GATEWAY_DB_PATH=/data/gateway_state.db \
    PYTHONUNBUFFERED=1

RUN mkdir -p /data

EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8420/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8420"]
