
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    stored_filename: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )

    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    page_count: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    pages: Mapped[list["DocumentPage"]] = relationship(
        "DocumentPage",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    page_number: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    text_content: Mapped[str] = mapped_column(
        String, nullable=False, default=""
    )

    document: Mapped["Document"] = relationship(
        "Document",
        back_populates="pages",
    )

    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "page_number",
            name="uq_document_page_number",
        ),
    )
