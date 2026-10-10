/**
 * EcoTwin Kolhapur — Shared Frontend API Client Foundation
 *
 * Implements resilient HTTP transport layer conforming to EcoTwin_Shared_API_Contract.md.
 * Features:
 * - Base URL resolution from VITE_API_BASE_URL (defaults to http://localhost:3000)
 * - Strict typing for GET, POST, PUT, DELETE, and generic requests
 * - JSON body serialization & safe parsing (with 204 No Content / empty body support)
 * - Request timeout via AbortController
 * - Error normalization: extracts `{ error: { code, message } }` contract
 * - Sanitizes internal server errors (5xx) to prevent exposing stack traces to end users
 * - Categorizes Network and Timeout failures with distinct error codes
 */

/**
 * Standard backend error payload matching EcoTwin Shared API Contract:
 * {
 *   "error": {
 *     "code": "ZONE_NOT_FOUND",
 *     "message": "The requested zone was not found."
 *   }
 * }
 */
export interface BackendErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  code?: string;
  message?: string;
}

/**
 * Normalized API Client Error for consumption by frontend views & hooks.
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;

  constructor(options: {
    message: string;
    code?: string;
    status?: number;
    details?: unknown;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.status = options.status || 0;
    this.details = options.details;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isTimeout = Boolean(options.isTimeout);

    // Set prototype explicitly for correct instanceof checks in transpiled JS
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  /**
   * Returns a friendly, user-facing error message without raw server internals.
   */
  public getUserFriendlyMessage(): string {
    if (this.isNetworkError) {
      return 'Unable to connect to the environmental intelligence server. Please check your network connection.';
    }
    if (this.isTimeout) {
      return 'The request timed out. The environmental monitoring service may be experiencing high load.';
    }
    if (this.status === 404) {
      return this.message || 'The requested environmental resource was not found.';
    }
    if (this.status >= 500) {
      return 'An internal service error occurred. Please try again shortly.';
    }
    return this.message || 'An unexpected error occurred while communicating with the server.';
  }
}

/**
 * Type guard for ApiClientError
 */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Request options for API client calls
 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /**
   * Request timeout in milliseconds (default: 10000ms)
   */
  timeoutMs?: number;
  /**
   * Query string parameters to append to URL
   */
  params?: Record<string, string | number | boolean | null | undefined>;
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  /**
   * Request body (object will be JSON-stringified, string/FormData passed directly)
   */
  body?: unknown;
}

/**
 * Resolves API Base URL from Vite environment variables.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Checks whether application is running in mock/demo mode.
 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * Builds a qualified URL combining the base URL, endpoint path, and query parameters.
 */
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let url: URL;
  try {
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      url = new URL(`${baseUrl}${cleanEndpoint}`);
    } else {
      // Relative base URL
      url = new URL(`${baseUrl}${cleanEndpoint}`, window.location.origin);
    }
  } catch {
    url = new URL(`${baseUrl}${cleanEndpoint}`, window.location.origin);
  }

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  return url.toString();
}

/**
 * Shared API Client implementation
 */
export class ApiClient {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 10000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Core request dispatcher with JSON serialization, timeout, error parsing, and sanitization.
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeoutMs = this.defaultTimeoutMs,
      params,
      headers: customHeaders = {},
      body,
      signal: callerSignal,
      ...fetchOptions
    } = options;

    const url = buildApiUrl(endpoint, params);

    // Prepare headers and body serialization
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...customHeaders,
    };

    let serializedBody: BodyInit | undefined = undefined;

    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        serializedBody = body;
      } else if (
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        body instanceof ArrayBuffer
      ) {
        serializedBody = body;
      } else {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        try {
          serializedBody = JSON.stringify(body);
        } catch (serializationErr) {
          throw new ApiClientError({
            message: 'Failed to serialize request payload to JSON.',
            code: 'REQUEST_SERIALIZATION_ERROR',
            details: serializationErr,
          });
        }
      }
    }

    // Configure AbortController for timeout & combine with caller signal
    const controller = new AbortController();
    let isTimeoutTriggered = false;

    const timerId = setTimeout(() => {
      isTimeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    if (callerSignal) {
      if (callerSignal.aborted) {
        clearTimeout(timerId);
        controller.abort();
      } else {
        callerSignal.addEventListener('abort', () => {
          clearTimeout(timerId);
          controller.abort();
        });
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: serializedBody,
        signal: controller.signal,
      });

      // Handle HTTP non-2xx status codes
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle 204 No Content, 205 Reset Content, or empty responses
      if (response.status === 204 || response.status === 205) {
        return null as unknown as T;
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return null as unknown as T;
      }

      // Safe JSON parsing
      try {
        const parsedJson = JSON.parse(responseText);
        return parsedJson as T;
      } catch {
        // If content is not valid JSON but status was 200, return text if typed as string
        return responseText as unknown as T;
      }
    } catch (err: unknown) {
      // Re-throw if already an ApiClientError
      if (err instanceof ApiClientError) {
        throw err;
      }

      // Handle Abort / Timeout errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (isTimeoutTriggered) {
          throw new ApiClientError({
            message: `Request timed out after ${timeoutMs}ms.`,
            code: 'REQUEST_TIMEOUT',
            isTimeout: true,
          });
        }
        throw new ApiClientError({
          message: 'The request was aborted.',
          code: 'REQUEST_ABORTED',
        });
      }

      // Handle Network / Connection errors (e.g. offline, CORS failure, connection refused)
      if (err instanceof TypeError) {
        throw new ApiClientError({
          message: 'Network request failed. Ensure server is running and accessible.',
          code: 'NETWORK_ERROR',
          isNetworkError: true,
          details: err.message,
        });
      }

      // Fallback unexpected error
      const message = err instanceof Error ? err.message : 'An unexpected request error occurred.';
      throw new ApiClientError({
        message,
        code: 'UNKNOWN_CLIENT_ERROR',
        details: err,
      });
    } finally {
      clearTimeout(timerId);
    }
  }

  /**
   * Helper for HTTP GET requests
   */
  public async get<T>(endpoint: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Helper for HTTP POST requests
   */
  public async post<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  /**
   * Helper for HTTP PUT requests
   */
  public async put<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  /**
   * Helper for HTTP DELETE requests
   */
  public async delete<T>(endpoint: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Extracts error payload matching `{ error: { code, message } }`
   * and prevents leaking internal server details (5xx) to the user.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorEnvelope: BackendErrorEnvelope | null = null;
    let rawText = '';

    try {
      rawText = await response.text();
      if (rawText) {
        errorEnvelope = JSON.parse(rawText) as BackendErrorEnvelope;
      }
    } catch {
      // Body was not JSON or empty
    }

    const status = response.status;
    let code = `HTTP_${status}`;
    let message = `Request failed with status ${status}`;

    // Extract structured error from contract if present
    if (errorEnvelope?.error?.code) {
      code = errorEnvelope.error.code;
    } else if (errorEnvelope?.code) {
      code = errorEnvelope.code;
    }

    if (errorEnvelope?.error?.message) {
      message = errorEnvelope.error.message;
    } else if (errorEnvelope?.message) {
      message = errorEnvelope.message;
    }

    // Security & Anti-Leak rule: Sanitize internal 5xx errors
    // Never expose database traces, file paths, or internal server errors to users
    if (status >= 500) {
      if (!errorEnvelope?.error?.code) {
        code = 'INTERNAL_SERVER_ERROR';
      }
      message = 'An unexpected internal server error occurred. Please try again later.';
    }

    throw new ApiClientError({
      message,
      code,
      status,
      details: errorEnvelope?.error?.details || (status < 500 ? rawText : undefined),
    });
  }
}

/**
 * Singleton instance of the shared API client
 */
export const apiClient = new ApiClient();
