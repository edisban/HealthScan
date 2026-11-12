"""Only the backend may call the model endpoints: it sends the shared secret in a header."""
import hmac

from fastapi import Request
from fastapi.responses import JSONResponse

from app import config


async def require_shared_secret(request: Request, call_next):
    secret = config.AI_SHARED_SECRET
    # /health stays open for the container healthcheck
    if secret and request.url.path != "/health":
        given = request.headers.get(config.SECRET_HEADER, "")
        # Constant-time comparison, so response timing does not leak how much of the secret matched
        if not hmac.compare_digest(given.encode("utf-8"), secret.encode("utf-8")):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid internal secret"})
    return await call_next(request)
