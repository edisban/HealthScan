import { useState, useCallback } from "react";
import { imageApi } from "@/api/image";
import type { ImageAnalysisResponse } from "@/api/image";
import { getPhotoUri, PhotoSource } from "@/utils/photo";

export interface UseImageAnalysisReturn {
  result: ImageAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  pickImage: () => Promise<void>;
  takePhoto: () => Promise<void>;
  analyzeUri: (uri: string) => Promise<void>;
  reset: () => void;
}

export const useImageAnalysis = (): UseImageAnalysisReturn => {
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeUri = useCallback(async (uri: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await imageApi.analyzeImage(uri);
      setResult({ ...json, imageUri: uri });
    } catch (e) {
      setError((e as Error).message || "Image analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const fromSource = useCallback(
    async (source: PhotoSource) => {
      try {
        // Square crop keeps the fruit centered for the detector
        const uri = await getPhotoUri(source, { allowsEditing: true, aspect: [1, 1] });
        if (uri) await analyzeUri(uri);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [analyzeUri]
  );

  const pickImage = useCallback(() => fromSource("library"), [fromSource]);
  const takePhoto = useCallback(() => fromSource("camera"), [fromSource]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, pickImage, takePhoto, analyzeUri, reset };
};
