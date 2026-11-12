import { request } from "./client";

export interface ImageAnalysisResponse {
  fruitDetected: boolean;
  fruitName: string;
  // What the photo shows when it is not a fruit, e.g. "cell phone"
  detectedObject?: string;
  quality: string;
  confidence: number;
  summary: string;
  imageUri?: string;
}

export const imageApi = {
  analyzeImage: (dataUrl: string): Promise<ImageAnalysisResponse> =>
    request("/api/v1/analyze-image-base64", { method: "POST", body: JSON.stringify({ image: dataUrl }) }),
};
