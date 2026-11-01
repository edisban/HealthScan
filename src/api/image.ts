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
    // Read image as base64 to avoid React Native FormData issues
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Failed to read image");
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

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
