from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    document_id: int | None = None
    top_k: int = Field(default=5, ge=1, le=10)


class SourceResponse(BaseModel):
    source_label: str
    document_id: int
    filename: str
    page_number: int
    chunk_index: int
    similarity: float
    content: str


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceResponse]
    model: str