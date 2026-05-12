import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.config import get_settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import User, Base
from app.auth.jwt import hash_password
from app.routers import exams, questions, answer_keys, sheets, submissions, results, users, admin_users, auth, candidates, examinations, batches, dashboard

settings = get_settings()

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # For SQLite (standalone mode): create all tables automatically
    if _is_sqlite:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

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

# API routers — must be registered before the static file catch-all
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
app.include_router(candidates.router, prefix=prefix, tags=["candidates"])
app.include_router(examinations.router, prefix=prefix, tags=["examinations"])
app.include_router(batches.router, prefix=prefix, tags=["batches"])
app.include_router(dashboard.router, prefix=prefix, tags=["dashboard"])


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve built frontend static files (standalone mode).
# Must be mounted AFTER all API routes so /api/v1/* is not caught by the SPA fallback.
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve the SPA index.html for all non-API routes (client-side routing)."""
        return FileResponse(os.path.join(_static_dir, "index.html"))
