// API Client for Hotel Dashboard
// Centralized HTTP client with JWT token management

import { ApiError, AuthTokens } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';


// Token storage keys
const ACCESS_TOKEN_KEY = 'hotel_access_token';
const REFRESH_TOKEN_KEY = 'hotel_refresh_token';

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (tokens: AuthTokens): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  hasTokens: (): boolean => !!localStorage.getItem(ACCESS_TOKEN_KEY),
};

// Custom error class for API errors
export class ApiClientError extends Error {
  public status: number;
  public code?: string;
  public field?: string;

  constructor(message: string, status: number, code?: string, field?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// Request interceptor to add auth headers
const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Response handler
const handleResponse = async <T>(response: Response, retryRequest?: () => Promise<Response>): Promise<T> => {
  if (!response.ok) {
    let errorData: ApiError = { detail: 'An error occurred' };

    try {
      errorData = await response.json();
    } catch {
      // Response might not be JSON
    }

    // Handle token expiration
    if (response.status === 401 && retryRequest) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const retryResponse = await retryRequest();
        return handleResponse<T>(retryResponse);
      } else {
        tokenStorage.clearTokens();
        refreshAttempts = 0;
        window.location.href = '/login';
      }
    }

    throw new ApiClientError(
      errorData.detail || 'Request failed',
      response.status,
      errorData.code,
      errorData.field
    );
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Token refresh logic
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 1;

const tryRefreshToken = async (): Promise<boolean> => {
  if (isRefreshing) {
    return refreshPromise!;
  }

  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    return false;
  }

  isRefreshing = true;
  refreshAttempts++;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const tokens: AuthTokens = await response.json();
      tokenStorage.setTokens(tokens);
      refreshAttempts = 0;
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Main API client
export const apiClient = {
  get: async <T>(endpoint: string, params?: Record<string, string>): Promise<T> => {
    const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const makeRequest = () => fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal,
    });

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return handleResponse<T>(response, makeRequest);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  post: async <T>(endpoint: string, data?: unknown, config?: RequestInit): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const headers = getHeaders(config?.headers);

    // Don't stringify FormData
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);

    // If FormData, remove Content-Type to let browser set boundary
    if (data instanceof FormData) {
      delete (headers as any)['Content-Type'];
    }

    const { headers: _unusedHeaders, ...restConfig } = config || {};

    const makeRequest = () => fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
      ...restConfig,
    });

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return handleResponse<T>(response, makeRequest);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  put: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const makeRequest = () => fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return handleResponse<T>(response, makeRequest);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  patch: async <T>(endpoint: string, data?: unknown): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const makeRequest = () => fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return handleResponse<T>(response, makeRequest);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const makeRequest = () => fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
      signal: controller.signal,
    });

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return handleResponse<T>(response, makeRequest);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
};

export default apiClient;
