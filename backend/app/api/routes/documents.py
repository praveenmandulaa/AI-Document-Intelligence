
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentPage
from app.models.user import User


from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import DocumentPage
from app.models.document_chunk import DocumentChunk
from app.models.user import User

from app.schemas.search import ChunkResponse, IndexResponse

from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import embed_texts

from app.schemas.document import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentPageResponse,
    DocumentResponse,
)
from app.services.pdf_service import (
    PDFProcessingError,
    extract_pdf_pages,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = (
    Path(__file__).resolve().parents[3]
    / "storage"
    / "uploads"
)


def get_owned_document(
    document_id: int,
    user_id: int,
    db: Session,
) -> Document:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return document


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = Path(
        (file.filename or "").replace("\\", "/")
    ).name

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    if file.content_type not in (
        "application/pdf",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF content type",
        )

    # Read at most 10 MB + 1 byte.
    # This prevents an unlimited request from being loaded
    # into application memory.
    try:
        pdf_bytes = file.file.read(MAX_FILE_SIZE + 1)
    finally:
        file.file.close()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty",
        )

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum allowed file size is 10 MB",
        )

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="File is not a valid PDF",
        )

    try:
        extracted_pages = extract_pdf_pages(pdf_bytes)
    except PDFProcessingError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    stored_filename = f"{uuid4().hex}.pdf"

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_path = UPLOAD_DIR / stored_filename

    try:
        # Exclusive creation avoids accidental overwrites.
        with stored_path.open("xb") as output:
            output.write(pdf_bytes)

        document = Document(
            user_id=current_user.id,
            original_filename=filename[:255],
            stored_filename=stored_filename,
            content_type="application/pdf",
            file_size=len(pdf_bytes),
            page_count=len(extracted_pages),
        )

        db.add(document)
        db.flush()

        for page_data in extracted_pages:
            db.add(
                DocumentPage(
                    document_id=document.id,
                    page_number=page_data["page_number"],
                    text_content=page_data["text_content"],
                )
            )

        db.commit()
        db.refresh(document)

        return document

    except Exception:
        db.rollback()
        stored_path.unlink(missing_ok=True)
        raise


@router.get(
    "",
    response_model=DocumentListResponse,
)
def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = (
        Document.user_id == current_user.id
    )

    total = db.scalar(
        select(func.count(Document.id)).where(
            conditions
        )
    ) or 0

    documents = db.scalars(
        select(Document)
        .where(conditions)
        .order_by(
            Document.created_at.desc(),
            Document.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": documents,
        "total": total,
    }


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_document(
        document_id,
        current_user.id,
        db,
    )


@router.get(
    "/{document_id}/pages",
    response_model=list[DocumentPageResponse],
)
def get_document_pages(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_owned_document(
        document_id,
        current_user.id,
        db,
    )

    pages = db.scalars(
        select(DocumentPage)
        .where(
            DocumentPage.document_id == document.id
        )
        .order_by(DocumentPage.page_number)
    ).all()

    return pages


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_owned_document(
        document_id,
        current_user.id,
        db,
    )

    stored_path = (
        UPLOAD_DIR / document.stored_filename
    )
    db.execute(
    delete(DocumentChunk).where(
        DocumentChunk.document_id == document.id,
        DocumentChunk.user_id == current_user.id,
    )
)
    db.delete(document)
    db.commit()

    # Remove the physical file after the database commit.
    stored_path.unlink(missing_ok=True)

    return {
        "message": "Document deleted successfully"
    }

@router.post(
    "/{document_id}/index",
    response_model=IndexResponse,
)
def index_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure the document belongs to the logged-in user
    document = get_owned_document(
        document_id,
        current_user.id,
        db,
    )

    # Fetch extracted PDF pages
    pages = db.scalars(
        select(DocumentPage)
        .where(DocumentPage.document_id == document.id)
        .order_by(DocumentPage.page_number)
    ).all()

    # Split extracted text into chunks
    chunks = chunk_document_pages(pages)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in this document",
        )

    # Generate 384-dimensional embeddings
    try:
        embeddings = embed_texts(
            [chunk["content"] for chunk in chunks]
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to generate document embeddings",
        ) from exc

    # Replace old embeddings when re-indexing
    try:
        db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id == document.id,
                DocumentChunk.user_id == current_user.id,
            )
        )

        for chunk, embedding in zip(
            chunks,
            embeddings,
            strict=True,
        ):
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    user_id=current_user.id,
                    chunk_index=chunk["chunk_index"],
                    page_number=chunk["page_number"],
                    content=chunk["content"],
                    embedding=embedding,
                )
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return IndexResponse(
        document_id=document.id,
        chunks_created=len(chunks),
        message="Document indexed successfully",
    )

@router.get(
    "/{document_id}/chunks",
    response_model=list[ChunkResponse],
)
def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify document ownership
    document = get_owned_document(
        document_id,
        current_user.id,
        db,
    )

    # Return chunks in their original order
    chunks = db.scalars(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == document.id,
            DocumentChunk.user_id == current_user.id,
        )
        .order_by(DocumentChunk.chunk_index)
    ).all()

    return chunks
