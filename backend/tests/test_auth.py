import pytest
from httpx import AsyncClient

# Basic Health Check Test
@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# Auth Tests
@pytest.mark.asyncio
async def test_signup_and_login(client: AsyncClient):
    # 1. Signup
    signup_payload = {
        "email": "test@example.com",
        "password": "Password123",
        "name": "Test User",
        "hotel_name": "Test Hotel"
    }
    response = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == signup_payload["email"]

    # 2. Login
    login_payload = {
        "email": "test@example.com",
        "password": "Password123"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    login_data = response.json()
    assert "access_token" in login_data

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    # Try to login with non-existent user
    login_payload = {
        "email": "wrong@example.com",
        "password": "WrongPassword"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
