type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

class ApiClient {
  /**
   * Uses relative URLs (/api/...) so requests are same-origin.
   * In development, Next.js rewrites /api/* -> http://localhost:8787/api/*
   * In production, Next.js rewrites /api/* -> https://api.tuktakdot.com/api/*
   *
   * This ensures session cookies are sent with every request.
   * Uses `credentials: 'include'` so Better Auth cookies are included.
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    // SSR-safe: use relative URL when window is not available
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const url = new URL(path, base || 'http://localhost:3000');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Skip undefined and `false` — APIs treat the literal string "false"
        // as truthy, so boolean flags are only sent when enabled.
        if (value !== undefined && value !== false) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return base ? url.toString() : url.pathname + url.search;
  }

  /** Wrap fetch with an AbortController timeout so hung requests resolve/reject instead of spinning forever. */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Merge any caller-supplied signal with our timeout signal ({ once: true } prevents listener accumulation)
    const callerSignal = init.signal;
    const onAbort = () => controller.abort();
    if (callerSignal) {
      callerSignal.addEventListener('abort', onAbort, { once: true });
    }
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener('abort', onAbort);
    }
  }

  async get<T>(path: string, options?: FetchOptions): Promise<T> {
    const { params, timeout, ...fetchOptions } = options ?? {};
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      { credentials: 'include', ...fetchOptions, method: 'GET' },
      timeout
    );
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    const { params, timeout, ...fetchOptions } = options ?? {};
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      {
        credentials: 'include',
        ...fetchOptions,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fetchOptions?.headers },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );
    return this.handleResponse<T>(res);
  }

  async put<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    const { params, timeout, ...fetchOptions } = options ?? {};
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      {
        credentials: 'include',
        ...fetchOptions,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...fetchOptions?.headers },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    const { params, timeout, ...fetchOptions } = options ?? {};
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      {
        credentials: 'include',
        ...fetchOptions,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...fetchOptions?.headers },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string, options?: FetchOptions): Promise<T> {
    const { params, timeout, ...fetchOptions } = options ?? {};
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      {
        credentials: 'include',
        ...fetchOptions,
        method: 'DELETE',
      },
      timeout
    );
    return this.handleResponse<T>(res);
  }

  /**
   * Turn an API error body into a human-readable message. Error payloads are
   * not always plain strings: Hono's zValidator returns `error: { issues: [...] }`
   * for schema failures, and stringifying that into an Error yields the useless
   * "[object Object]".
   */
  private static errorMessage(body: unknown, status: number): string {
    if (typeof body === 'string' && body) return body;
    if (body && typeof body === 'object') {
      const { error, message } = body as { error?: unknown; message?: unknown };
      if (typeof error === 'string' && error) return error;
      if (typeof message === 'string' && message) return message;
      // Zod-style validation error: surface the first issue's message
      const issues =
        error && typeof error === 'object' && Array.isArray((error as { issues?: unknown }).issues)
          ? ((error as { issues: unknown[] }).issues ?? [])
          : Array.isArray(error)
            ? error
            : [];
      const first = issues.find(
        (i): i is { message: string } =>
          !!i && typeof i === 'object' && typeof (i as { message?: unknown }).message === 'string'
      );
      if (first) return first.message;
    }
    return `HTTP ${status}`;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const err = new Error(ApiClient.errorMessage(body, res.status));
      (err as Error & { status: number }).status = res.status;
      throw err;
    }
    // 204 No Content (or an empty body) would make res.json() throw
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}

export const api = new ApiClient();
