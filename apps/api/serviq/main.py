"""FastAPI entrypoint for SERVIQ."""
from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from threading import Lock

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .auth import require_current_user
from .routes import serviq

logger = logging.getLogger("serviq.api")

_ENV = os.environ.get("APP_ENV", "development").lower()
_IS_PROD = _ENV == "production"
_DOCS_TOKEN = os.environ.get("DOCS_TOKEN", "")

if _IS_PROD and not _DOCS_TOKEN:
    logger.warning(
        "DOCS_TOKEN is not set — /docs, /redoc and /openapi.json are fully blocked in production. "
        "Set DOCS_TOKEN to enable token-gated access to API documentation."
    )

# ---------------------------------------------------------------------------
# App — docs served via custom token-gated routes
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SERVIQ API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ---------------------------------------------------------------------------
# Secure headers
# ---------------------------------------------------------------------------
class _SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store"
        return response


# ---------------------------------------------------------------------------
# Request body size limit (default 10 MB, override via MAX_BODY_BYTES env)
# ---------------------------------------------------------------------------
_MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", 10 * 1024 * 1024))

class _BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > _MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large. Maximum is {_MAX_BODY_BYTES // (1024 * 1024)} MB."},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Rate limiting — sliding window per IP, in-memory
# (override via RATE_LIMIT_PER_MINUTE env, default 60)
# ---------------------------------------------------------------------------
_RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MINUTE", 60))
_RATE_WINDOW = 60.0
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()

def _client_ip(request: Request) -> str:
    # Cloudflare sets CF-Connecting-IP; fall back to X-Forwarded-For, then direct
    return (
        request.headers.get("cf-connecting-ip")
        or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )


class _RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/health":
            return await call_next(request)

        ip = _client_ip(request)
        now = time.monotonic()

        with _rate_lock:
            _rate_store[ip] = [t for t in _rate_store[ip] if now - t < _RATE_WINDOW]
            if len(_rate_store[ip]) >= _RATE_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Try again in a minute."},
                    headers={"Retry-After": "60"},
                )
            _rate_store[ip].append(now)

        return await call_next(request)


# Registration order: last-added = outermost (executes first on request, last on response).
# _SecureHeadersMiddleware must be outermost so it wraps ALL responses — including 429s
# returned by the rate limiter before call_next is reached.
app.add_middleware(_BodySizeLimitMiddleware)
app.add_middleware(_RateLimitMiddleware)
app.add_middleware(_SecureHeadersMiddleware)

# ---------------------------------------------------------------------------
# CORS — defaults to * (warns in production if not explicitly set)
# ---------------------------------------------------------------------------
_raw_origins = os.environ.get("CORS_ORIGINS", "").strip()
if _raw_origins:
    _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    _origins = ["*"]
    if _IS_PROD:
        logger.warning(
            "CORS_ORIGINS env var is not set — allowing all origins. "
            "Set CORS_ORIGINS to your frontend domain in production."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
_auth = [Depends(require_current_user)]

app.include_router(serviq.router, dependencies=_auth)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Docs — open in development, token-gated in production
# ---------------------------------------------------------------------------
_DOCS_DENIED = {
    "detail": "API docs are protected. Pass ?token=<DOCS_TOKEN> or Authorization: Bearer <token>."
}


def _docs_allowed(request: Request) -> bool:
    if not _IS_PROD:
        return True
    if not _DOCS_TOKEN:
        return False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and auth[7:] == _DOCS_TOKEN:
        return True
    return request.query_params.get("token") == _DOCS_TOKEN


@app.get("/docs", include_in_schema=False)
async def swagger_ui(request: Request):
    if not _docs_allowed(request):
        return JSONResponse(status_code=401, content=_DOCS_DENIED)
    token = request.query_params.get("token", "")
    openapi_url = f"/openapi.json?token={token}" if (_IS_PROD and token) else "/openapi.json"
    return get_swagger_ui_html(openapi_url=openapi_url, title="SERVIQ API")


@app.get("/redoc", include_in_schema=False)
async def redoc_ui(request: Request):
    if not _docs_allowed(request):
        return JSONResponse(status_code=401, content=_DOCS_DENIED)
    token = request.query_params.get("token", "")
    openapi_url = f"/openapi.json?token={token}" if (_IS_PROD and token) else "/openapi.json"
    return get_redoc_html(openapi_url=openapi_url, title="SERVIQ API")


@app.get("/openapi.json", include_in_schema=False)
async def openapi_schema(request: Request):
    if not _docs_allowed(request):
        return JSONResponse(status_code=401, content=_DOCS_DENIED)
    return JSONResponse(app.openapi())
