import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.core.config import get_settings

settings = get_settings()

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health_check(client):
    """
    Basic health check to ensure API is up.
    """
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
