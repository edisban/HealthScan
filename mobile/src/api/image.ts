import { API_BASE } from "@/constants/api";

export interface ImageAnalysisResponse {
  fruitDetected: boolean;
  fruitName: string;
  quality: string;
  confidence: number;
  summary: string;
  imageUri?: string;
}

export const imageApi = {
  analyzeImage: async (dataUrl: string): Promise<ImageAnalysisResponse> => {
    const apiResponse = await fetch(`${API_BASE}/api/v1/analyze-image-base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!apiResponse.ok) {
      throw new Error(`HTTP ${apiResponse.status}`);
    }
    return apiResponse.json();
  },
};
