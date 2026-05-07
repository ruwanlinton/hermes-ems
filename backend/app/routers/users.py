from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user, verify_password, hash_password
from app.db.session import get_db
from app.db.models import User

router = APIRouter()


class UserProfile(BaseModel):
    id: str
    username: str
    email: str | None
    name: str | None
    roles: list[str]

    class Config:
        from_attributes = True


class UpdateProfile(BaseModel):
    name: str | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@router.get("/users/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/users/me", response_model=UserProfile)
async def update_profile(
    body: UpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
        await db.commit()
        await db.refresh(current_user)
    return current_user


@router.post("/users/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
