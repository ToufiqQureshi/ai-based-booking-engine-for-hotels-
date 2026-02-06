"""
Application Configuration
Ye file environment variables se settings load karti hai.
Production mein .env file use karo.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import json


class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Hotelier Hub API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # SECURITY: Default to False for production
    
    # Database - PostgreSQL (Docker)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/hotelier_hub"
    
    # JWT Configuration
    # Secret key must be provided via environment variable in production
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - Can be overridden by CORS_ORIGINS_STR env variable (JSON array)
    CORS_ORIGINS_STR: str | None = None  # e.g., '["https://app.example.com"]'
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from env or use defaults."""
        if self.CORS_ORIGINS_STR:
            try:
                return json.loads(self.CORS_ORIGINS_STR)
            except json.JSONDecodeError:
                pass
        # Default origins for development
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "https://app.gadget4me.in",
            "https://api.gadget4me.in"
        ]

    # Public URLs (for emails, widgets, etc.)
    API_URL: str = "http://localhost:8001"
    FRONTEND_URL: str = "http://localhost:8080"

    # AI Config
    OPENAI_API_KEY: str | None = None
    OLLAMA_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Settings ko cache karta hai taaki bar bar load na ho.
    """
    return Settings()

