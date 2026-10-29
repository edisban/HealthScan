import { useState, useCallback } from "react";
import { productApi } from "@/api/products";
import { Product } from "@/api/types";

export interface UseProductReturn {
  result: Product | null;
  loading: boolean;
  error: string | null;
  fetchProduct: (barcode: string) => Promise<void>;
  reset: () => void;
}

export const useProduct = (lang: string): UseProductReturn => {
  const [result, setResult] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await productApi.fetchByBarcode(barcode, lang);
      setResult({ ...json, barcode } as Product);
    } catch (e) {
      setError((e as Error).message || "Connection error");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, fetchProduct, reset };
};
