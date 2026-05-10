from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class CandidateCreate(BaseModel):
    registration_number: str
    name: str
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    mobile: Optional[str] = None


class CandidateUpdate(BaseModel):
    registration_number: Optional[str] = None
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    mobile: Optional[str] = None


class CandidateOut(BaseModel):
    id: str
    registration_number: str
    name: str
    date_of_birth: Optional[date]
    address: Optional[str]
    mobile: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImportError(BaseModel):
    row: int
    message: str


class ImportResult(BaseModel):
    imported: int
    updated: int
    errors: list[ImportError]
