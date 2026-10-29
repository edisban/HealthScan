import { useState, useCallback } from "react";
import { imageApi } from "@/api/image";
import type { ImageAnalysisResponse } from "@/api/image";
import * as ImagePicker from "expo-image-picker";

export interface UseImageAnalysisReturn {
  result: ImageAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  pickImage: () => Promise<void>;
  analyzeUri: (uri: string) => Promise<void>;
  reset: () => void;
}

export const useImageAnalysis = (): UseImageAnalysisReturn => {
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted !== true) {
      setError("Photo library permission required");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
    const uri = pickerResult.assets[0].uri;
    await analyzeUri(uri);
  }, []);

  const analyzeUri = useCallback(async (uri: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await imageApi.analyzeImage(uri);
      setResult({
        ...json,
        imageUri: uri,
      } as ImageAnalysisResponse & { imageUri?: string });
    } catch (e) {
      setError((e as Error).message || "Image analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, pickImage, analyzeUri, reset };
};
