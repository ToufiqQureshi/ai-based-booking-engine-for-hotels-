import pytest
import asyncio
import os
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# Set environment variables for testing BEFORE importing app
os.environ["SECRET_KEY"] = "test_secret_key_for_unit_tests"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from main import app
from app.core.database import get_session
from app.core.config import get_settings

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=None,
)

TestingSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Creates a fresh database session for each test.
    Also handles creating/dropping tables.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a new FastAPI AsyncClient that uses the test database session.
    """
    def override_get_session():
        return db_session

    app.dependency_overrides[get_session] = override_get_session

    # Using ASGITransport for direct app communication without a network socket
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
