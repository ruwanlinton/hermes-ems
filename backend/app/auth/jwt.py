import httpx
from functools import lru_cache
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.db.session import get_db
from app.db.models import User

bearer_scheme = HTTPBearer()
settings = get_settings()

_jwks_cache: dict = {}


async def fetch_jwks() -> dict:
    url = f"{settings.ASGARDEO_BASE_URL}/oauth2/jwks"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()


async def get_jwks() -> dict:
    global _jwks_cache
    if not _jwks_cache:
        _jwks_cache = await fetch_jwks()
    return _jwks_cache


async def refresh_jwks() -> dict:
    global _jwks_cache
    _jwks_cache = await fetch_jwks()
    return _jwks_cache


async def decode_token(token: str) -> dict:
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token header: {e}"
        )

    kid = unverified_header.get("kid")
    jwks = await get_jwks()

    # Find the matching key
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = k
            break

    if key is None:
        # Refresh JWKS and retry (kid rotation)
        jwks = await refresh_jwks()
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break

    if key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to find signing key"
        )

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.JWT_AUDIENCE,
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token validation failed: {e}"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = await decode_token(token)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim")

    # Upsert user on first login
    result = await db.execute(select(User).where(User.sub == sub))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            sub=sub,
            email=payload.get("email"),
            name=payload.get("name") or payload.get("preferred_username"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user
