from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.jwt import get_current_user, hash_password, VALID_ROLES
from app.db.session import get_db
from app.db.models import User

router = APIRouter()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class UserOut(BaseModel):
    id: str
    username: str
    name: Optional[str]
    email: Optional[str]
    roles: List[str]

    class Config:
        from_attributes = True


class CreateUserBody(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = ["viewer"]


class UpdateUserBody(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[List[str]] = None
    password: Optional[str] = None


def _validate_roles(roles: List[str]) -> None:
    invalid = [r for r in roles if r not in VALID_ROLES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid roles: {invalid}. Valid roles: {sorted(VALID_ROLES)}")
    if not roles:
        raise HTTPException(status_code=400, detail="At least one role is required")


@router.get("/admin/users", response_model=list[UserOut])
async def list_users(_: User = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.post("/admin/users", response_model=UserOut, status_code=201)
async def create_user(
    body: CreateUserBody,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    _validate_roles(body.roles)
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
        name=body.name,
        email=body.email,
        roles=body.roles,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/admin/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UpdateUserBody,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.roles is not None:
        _validate_roles(body.roles)
        user.roles = body.roles
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.password:
        user.hashed_password = hash_password(body.password)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/admin/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    await db.delete(user)
    await db.commit()
