import { api } from "@/services/api";

type FrontendBootPayload = {
  platform: string;
  bootedAt: string;
};

type FrontendBootResponse = {
  message: string;
};

export async function notifyFrontendBoot(
  payload: FrontendBootPayload,
): Promise<FrontendBootResponse> {
  return api.post<FrontendBootResponse>("/health/frontend-boot", payload);
}
