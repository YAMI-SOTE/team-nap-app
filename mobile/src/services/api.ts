const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}
