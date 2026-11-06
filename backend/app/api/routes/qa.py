import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.schemas.qa import AskRequest, AskResponse, SourceResponse
from app.services.embedding_service import embed_query
from app.services.gemini_service import generate_document_answer

router = APIRouter(prefix="/qa", tags=["Document Q&A"])


@router.post("/ask", response_model=AskResponse)
def ask_documents(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = payload.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be empty.",
        )

    # Generate an embedding for the question.
    try:
        query_vector = embed_query(question)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not generate the question embedding.",
        ) from exc

    # Calculate cosine distance and retrieve only this user's chunks.
    distance = DocumentChunk.embedding.cosine_distance(query_vector)

    statement = (
        select(DocumentChunk, Document.original_filename, distance.label("distance"))
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(DocumentChunk.user_id == current_user.id)
        .order_by(distance.asc())
        .limit(payload.top_k)
    )

    if payload.document_id is not None:
        statement = statement.where(
            DocumentChunk.document_id == payload.document_id
        )

    rows = db.execute(statement).all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No indexed document chunks found. Upload and index a PDF first.",
        )

    sources = []
    context_parts = []

    for index, row in enumerate(rows, start=1):
        chunk, filename, cosine_distance = row

        # Similarity is an approximate display score derived from cosine distance.
        similarity = max(0.0, min(1.0, 1.0 - float(cosine_distance)))

        source_label = f"S{index}"

        sources.append(
            SourceResponse(
                source_label=source_label,
                document_id=chunk.document_id,
                filename=filename,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                similarity=round(similarity * 100, 2),
                content=chunk.content,
            )
        )

        context_parts.append(
            f"""
[{source_label}]
Filename: {filename}
Page: {chunk.page_number}
Chunk: {chunk.chunk_index}

Content:
{chunk.content}
"""
        )

    context = "\n\n".join(context_parts)

    # Generate the final answer using Gemini.
    try:
        answer = generate_document_answer(
            question=question,
            context=context,
        )
    except Exception as exc:
        # Log the actual error in the backend terminal for diagnosis.
        print(f"Gemini generation error: {exc}")

        raise HTTPException(
            status_code=502,
            detail="The AI service could not generate an answer. Please try again.",
        ) from exc

    return AskResponse(
        question=question,
        answer=answer,
        sources=sources,
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    )