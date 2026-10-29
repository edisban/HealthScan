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
  analyzeImage: async (uri: string): Promise<ImageAnalysisResponse> => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any);
    const response = await fetch(`${API_BASE}/api/v1/analyze-image`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  },
};
