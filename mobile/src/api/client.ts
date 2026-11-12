import { API_BASE, API_KEY } from "@/constants/api";

export const API_KEY_HEADER = "X-Api-Key";

export const request = async (path: string, init: RequestInit = {}): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (API_KEY) headers[API_KEY_HEADER] = API_KEY;
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};
