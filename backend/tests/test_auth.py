
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool


from app.db.base import Base
from app.db.session import get_db
import app.models
from app.main import app as fastapi_app



# Separate in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite+pysqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
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


# Test 1: Registration, login and protected profile
def test_register_login_and_profile(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Employee",
            "email": "employee@example.com",
            "password": "TestPassword123!"
        }
    )

    assert register_response.status_code == 201
    assert register_response.json()["email"] == "employee@example.com"
    assert "hashed_password" not in register_response.json()

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "employee@example.com",
            "password": "TestPassword123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    assert token

    profile_response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "employee@example.com"


# Test 2: Protected API without JWT
def test_unauthorized_profile(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


# Test 3: Duplicate registration
def test_duplicate_registration(client):
    payload = {
        "name": "Test Employee",
        "email": "employee@example.com",
        "password": "TestPassword123!"
    }

    first_response = client.post(
        "/api/v1/auth/register",
        json=payload
    )

    second_response = client.post(
        "/api/v1/auth/register",
        json=payload
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


# Test 4: Invalid login credentials
def test_invalid_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "WrongPassword123!"
        }
    )

    assert response.status_code == 401


# Test 5: Incorrect password
def test_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Employee",
            "email": "employee@example.com",
            "password": "TestPassword123!"
        }
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "employee@example.com",
            "password": "IncorrectPassword123!"
        }
    )

    assert response.status_code == 401


# Test 6: Invalid JWT
def test_invalid_jwt(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": "Bearer invalid.jwt.token"
        }
    )

    assert response.status_code == 401
