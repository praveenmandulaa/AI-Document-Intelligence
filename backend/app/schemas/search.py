
from pydantic import BaseModel, Field


class IndexResponse(BaseModel):
    document_id: int
    chunks_created: int
    message: str


class ChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    page_number: int
    content: str


class SemanticSearchRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=1000,
    )
    document_id: int | None = Field(
        default=None,
        ge=1,
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
    )


class SearchResult(BaseModel):
    document_id: int
    document_name: str
    chunk_id: int
    page_number: int
    content: str
    similarity_score: float


class SemanticSearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
