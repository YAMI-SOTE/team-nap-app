export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "team-nap-api",
    timestamp: new Date().toISOString(),
  };
}
