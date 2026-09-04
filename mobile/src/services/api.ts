import { config } from "@/constants/config";

/**
 * Bearer token for authenticated requests. `AuthContext` keeps this in
 * sync with the stored session. Requests made without a token hit the API
 * unauthenticated (and get a 401) — the route guard makes sure protected
 * screens only mount once a session exists, so that path shouldn't be
 * reached in normal use.
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
  /** The server's `details` payload, when it sent one (zod field errors). */
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type FlattenedErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

/**
 * The most specific message the server offered.
 *
 * A 400 from `validate` carries a generic `error` ("入力内容を確認して
 * ください") plus `details.fieldErrors` holding the message that actually
 * says what is wrong — e.g. "就寝から起床までが 16 時間以内になるよう
 * 入力してください". Those messages are written for the user, so prefer
 * them; without this the caller can only show the generic line and the
 * user has no way to find out what to change.
 */
function bestMessage(fallback: string, body: unknown): string {
  const details = (body as { details?: FlattenedErrors } | null)?.details;
  const fromField = Object.values(details?.fieldErrors ?? {})
    .flatMap((messages) => messages ?? [])
    .find((message) => message.trim().length > 0);
  if (fromField) return fromField;
  const fromForm = details?.formErrors?.find((m) => m.trim().length > 0);
  return fromForm ?? fallback;
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
  const sentBearer = Boolean(authToken);
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
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

  // Only a 401 on a request we actually authenticated means "your session
  // died". A 401 on an unauthenticated request (a screen that fetched
  // before sign-in / before the stored token was restored) must NOT wipe
  // the session.
  if (response.status === 401 && sentBearer) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let message = "通信に失敗しました（" + response.status + "）";
    let details: unknown;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
      details = (body as { details?: unknown } | null)?.details;
      message = bestMessage(message, body);
    } catch {
      // no JSON body
    }
    throw new ApiError(response.status, message, details);
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

  del<T = void>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: "DELETE",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  },
};
