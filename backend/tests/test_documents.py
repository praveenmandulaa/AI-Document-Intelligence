
import io

import pymupdf
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
import app.models
from app.main import app as fastapi_app


engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        with Session(engine) as db:
            yield db

    fastapi_app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client
    finally:
        fastapi_app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


def authenticated_headers(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Document Tester",
            "email": "docs@example.com",
            "password": "TestPassword123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "docs@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_sample_pdf():
    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_text(
        (72, 72),
        "AI Document Intelligence Test",
    )
    content = pdf.tobytes()
    pdf.close()
    return content


def upload_sample_pdf(client, headers):
    return client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={
            "file": (
                "sample.pdf",
                io.BytesIO(create_sample_pdf()),
                "application/pdf",
            )
        },
    )


def test_upload_and_extract(client):
    headers = authenticated_headers(client)

    response = upload_sample_pdf(client, headers)

    assert response.status_code == 201

    document = response.json()
    assert document["page_count"] == 1

    pages_response = client.get(
        f"/api/v1/documents/{document['id']}/pages",
        headers=headers,
    )

    assert pages_response.status_code == 200

    pages = pages_response.json()
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert "AI Document Intelligence" in (
        pages[0]["text_content"]
    )


def test_upload_requires_authentication(client):
    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "sample.pdf",
                io.BytesIO(create_sample_pdf()),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 401


def test_reject_invalid_pdf(client):
    headers = authenticated_headers(client)

    response = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={
            "file": (
                "invalid.pdf",
                b"This is not a real PDF",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400


def test_list_and_delete_document(client):
    headers = authenticated_headers(client)

    upload_response = upload_sample_pdf(
        client,
        headers,
    )
    assert upload_response.status_code == 201

    document_id = upload_response.json()["id"]

    list_response = client.get(
        "/api/v1/documents",
        headers=headers,
    )

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    delete_response = client.delete(
        f"/api/v1/documents/{document_id}",
        headers=headers,
    )

    assert delete_response.status_code == 200

    get_response = client.get(
        f"/api/v1/documents/{document_id}",
        headers=headers,
    )

    assert get_response.status_code == 404
