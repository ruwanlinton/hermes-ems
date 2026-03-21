import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.auth.jwt import hash_password
from app.routers import exams, questions, answer_keys, sheets, submissions, results, users, admin_users, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Seed default admin user if no users exist
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none() is None:
            admin = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                name="Administrator",
                roles=["admin"],
            )
            db.add(admin)
            await db.commit()
    yield


app = FastAPI(
    title="SLMC OMR API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
prefix = "/api/v1"
app.include_router(auth.router, prefix=prefix, tags=["auth"])
app.include_router(exams.router, prefix=prefix, tags=["exams"])
app.include_router(questions.router, prefix=prefix, tags=["questions"])
app.include_router(answer_keys.router, prefix=prefix, tags=["answer-keys"])
app.include_router(sheets.router, prefix=prefix, tags=["sheets"])
app.include_router(submissions.router, prefix=prefix, tags=["submissions"])
app.include_router(results.router, prefix=prefix, tags=["results"])
app.include_router(users.router, prefix=prefix, tags=["users"])
app.include_router(admin_users.router, prefix=prefix, tags=["admin"])


@app.get("/health")
async def health():
    return {"status": "ok"}
