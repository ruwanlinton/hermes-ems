from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BatchCreate(BaseModel):
    name: str


class BatchUpdate(BaseModel):
    name: str


class BatchOut(BaseModel):
    id: str
    examination_id: str
    name: str
    member_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class MembershipCreate(BaseModel):
    candidate_id: str
    index_number: str


class MembershipOut(BaseModel):
    id: str
    batch_id: str
    candidate_id: str
    index_number: str
    candidate_name: str
    candidate_registration_number: str

    class Config:
        from_attributes = True


class MembershipImportError(BaseModel):
    row: int
    message: str


class MembershipImportResult(BaseModel):
    enrolled: int
    errors: list[MembershipImportError]
