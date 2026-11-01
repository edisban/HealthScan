import { API_BASE } from "@/constants/api";

export const request = async (path: string, init: RequestInit = {}): Promise<any> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};
