"""
Rate Limiter Configuration
Uses slowapi/limits to prevent brute-force attacks.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize limiter with remote address key
limiter = Limiter(key_func=get_remote_address)
