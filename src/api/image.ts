import { API_BASE } from "@/constants/api";
import { uriToBase64 } from "@/utils/photo";

export interface ImageAnalysisResponse {
  fruitDetected: boolean;
  fruitName: string;
  quality: string;
  confidence: number;
  summary: string;
  imageUri?: string;
}

export const imageApi = {
  analyzeImage: async (uri: string): Promise<ImageAnalysisResponse> => {
    const base64 = await uriToBase64(uri);
    const apiResponse = await fetch(`${API_BASE}/api/v1/analyze-image-base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });
    if (!apiResponse.ok) {
      throw new Error(`HTTP ${apiResponse.status}`);
    }
    return apiResponse.json();
  },
};
