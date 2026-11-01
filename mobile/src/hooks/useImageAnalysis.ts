import { useState, useCallback } from "react";
import { imageApi } from "@/api/image";
import type { ImageAnalysisResponse } from "@/api/image";
import { getPhoto, Photo, PhotoSource } from "@/utils/photo";

export interface UseImageAnalysisReturn {
  result: ImageAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  pickImage: () => Promise<void>;
  takePhoto: () => Promise<void>;
  analyzePhoto: (photo: Photo) => Promise<void>;
  reset: () => void;
}

export const useImageAnalysis = (): UseImageAnalysisReturn => {
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = useCallback(async (photo: Photo) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await imageApi.analyzeImage(photo.dataUrl);
      setResult({ ...json, imageUri: photo.uri });
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
        const photo = await getPhoto(source, { allowsEditing: true, aspect: [1, 1] });
        if (photo) await analyzePhoto(photo);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [analyzePhoto]
  );

  const pickImage = useCallback(() => fromSource("library"), [fromSource]);
  const takePhoto = useCallback(() => fromSource("camera"), [fromSource]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, pickImage, takePhoto, analyzePhoto, reset };
};
