import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import exams, questions, answer_keys, sheets, submissions, results

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
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
app.include_router(exams.router, prefix=prefix, tags=["exams"])
app.include_router(questions.router, prefix=prefix, tags=["questions"])
app.include_router(answer_keys.router, prefix=prefix, tags=["answer-keys"])
app.include_router(sheets.router, prefix=prefix, tags=["sheets"])
app.include_router(submissions.router, prefix=prefix, tags=["submissions"])
app.include_router(results.router, prefix=prefix, tags=["results"])


@app.get("/health")
async def health():
    return {"status": "ok"}
