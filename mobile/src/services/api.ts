import { config } from "@/constants/config";

/**
 * Bearer token for authenticated requests. `AuthContext` keeps this in
 * sync with the stored session; requests made before sign-in fall back to
 * the legacy `X-User-Id` header so the not-yet-authenticated screens
 * (home / schedule / stats) keep working.
 */
let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Called once when any request comes back 401 (session gone/expired). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** True when the request never reached the server (offline / backend down). */
export function isConnectionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!config.apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  } else {
    headers["X-User-Id"] = config.userId;
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // fetch rejects (no status) when the request never reached the server.
    throw new ApiError(0, "サーバーに接続できません");
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // no JSON body
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint);
  },

  post<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  del<T = void>(endpoint: string) {
    return request<T>(endpoint, { method: "DELETE" });
  },
};
