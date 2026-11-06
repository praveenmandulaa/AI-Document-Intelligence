
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User

from app.schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResponse,
)

from app.services.embedding_service import embed_query


router = APIRouter(
    prefix="/search",
    tags=["Semantic Search"],
)


@router.post(
    "/semantic",
    response_model=SemanticSearchResponse,
)
def semantic_search(
    request: SemanticSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.document_id is not None:
        document_id = db.scalar(
            select(Document.id).where(
                Document.id == request.document_id,
                Document.user_id == current_user.id,
            )
        )

        if document_id is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found",
            )

    try:
        query_vector = embed_query(request.query)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to generate search embedding",
        ) from exc

    distance = DocumentChunk.embedding.cosine_distance(
        query_vector
    )

    statement = (
        select(
            DocumentChunk,
            Document.original_filename,
            distance.label("distance"),
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            DocumentChunk.user_id == current_user.id,
            Document.user_id == current_user.id,
        )
    )

    if request.document_id is not None:
        statement = statement.where(
            DocumentChunk.document_id == request.document_id
        )

    statement = (
        statement
        .order_by(distance)
        .limit(request.top_k)
    )

    rows = db.execute(statement).all()

    results = []

    for chunk, filename, cosine_distance in rows:
        similarity = max(
            -1.0,
            min(1.0, 1.0 - float(cosine_distance)),
        )

        results.append(
            {
                "document_id": chunk.document_id,
                "document_name": filename,
                "chunk_id": chunk.id,
                "page_number": chunk.page_number,
                "content": chunk.content,
                "similarity_score": round(similarity, 4),
            }
        )

    return {
        "query": request.query,
        "results": results,
    }
