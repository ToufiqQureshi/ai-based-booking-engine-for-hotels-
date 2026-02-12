import pytest
from unittest.mock import AsyncMock, patch
import hmac
import hashlib
import json
import httpx
import sys
import os
import asyncio

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.v1.integration import _send_webhook_event

def run_async(coro):
    return asyncio.run(coro)

def test_send_webhook_event_success():
    url = "https://example.com/webhook"
    payload = {"test": "data"}
    secret = "test_secret"

    mock_response = httpx.Response(200)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        success, message, status_code = run_async(_send_webhook_event(url, payload, secret))

        assert success is True
        assert status_code == 200
        mock_post.assert_called_once()

        args, kwargs = mock_post.call_args
        assert args[0] == url
        assert kwargs["content"] == json.dumps(payload)

        headers = kwargs["headers"]
        assert "X-Hub-Signature-256" in headers

        expected_signature = hmac.new(
            secret.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        assert headers["X-Hub-Signature-256"] == f"sha256={expected_signature}"

def test_send_webhook_event_failure():
    url = "https://example.com/webhook"
    payload = {"test": "data"}

    mock_response = httpx.Response(500, content=b"Internal Server Error")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        success, message, status_code = run_async(_send_webhook_event(url, payload))

        assert success is False
        assert status_code == 500
        assert "failed with status 500" in message

def test_send_webhook_event_connection_error():
    url = "https://example.com/webhook"
    payload = {"test": "data"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectError("Connection failed")

        success, message, status_code = run_async(_send_webhook_event(url, payload))

        assert success is False
        assert "Connection error" in message
        assert status_code is None
