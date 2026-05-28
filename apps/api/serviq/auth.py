"""Authentication: Supabase JWT (primary) + API key (service/test fallback)."""
from __future__ import annotations

import os
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

_ALGORITHM = "HS256"
_AUDIENCE = "authenticated"


@dataclass(frozen=True)
class UserContext:
    user_id: str
    email: str | None = None


def _verify_jwt(token: str) -> UserContext:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "SUPABASE_JWT_SECRET is not configured on the server.",
        )
    try:
        payload = jwt.decode(token, secret, algorithms=[_ALGORITHM], audience=_AUDIENCE)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has expired.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token audience is invalid.")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token is missing the sub claim.")

    return UserContext(user_id=user_id, email=payload.get("email"))


def require_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    api_key: str | None = Security(_api_key_header),
) -> UserContext:
    """Accept Supabase JWT (preferred) or API key (service/test fallback)."""
    if credentials is not None:
        return _verify_jwt(credentials.credentials)

    if api_key:
        expected = os.environ.get("OPENOPS_API_KEY", "").strip()
        if not expected:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "OPENOPS_API_KEY is not configured on the server.",
            )
        if api_key != expected:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "Invalid or missing API key.",
            )
        service_user_id = os.environ.get("OPENOPS_SERVICE_USER_ID", "service")
        return UserContext(user_id=service_user_id)

    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Authentication required. Pass 'Authorization: Bearer <token>' or 'X-API-Key' header.",
    )


# Kept for the security-middleware tests that import and call it directly.
def require_api_key(key: str | None = Security(_api_key_header)) -> str:
    expected = os.environ.get("OPENOPS_API_KEY", "").strip()
    if not expected:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "OPENOPS_API_KEY is not configured on the server.",
        )
    if not key or key != expected:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid or missing API key. Pass X-API-Key header.",
        )
    return key
