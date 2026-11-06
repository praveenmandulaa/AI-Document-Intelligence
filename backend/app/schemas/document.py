
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    original_filename: str
    content_type: str
    file_size: int
    page_count: int
    created_at: datetime


class DocumentPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    page_number: int
    text_content: str


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int


class DocumentDeleteResponse(BaseModel):
    message: str
