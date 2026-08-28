import { config } from "@/constants/config";

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!config.apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
};
