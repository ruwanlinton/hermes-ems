from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
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
