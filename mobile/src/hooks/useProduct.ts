import { useState, useCallback } from "react";
import { productApi } from "@/api/products";
import { Product } from "@/api/types";
import { getPhotoUri, PhotoSource } from "@/utils/photo";

export type ProductLoadingKind = "lookup" | "label" | "web";

export interface UseProductReturn {
  result: Product | null;
  loading: boolean;
  loadingKind: ProductLoadingKind;
  error: string | null;
  // True after a web search for the current barcode came back empty
  webSearchFailed: boolean;
  fetchProduct: (barcode: string) => Promise<void>;
  analyzeLabel: (barcode: string, source: PhotoSource) => Promise<void>;
  searchWeb: (barcode: string) => Promise<void>;
  reset: () => void;
}

export const useProduct = (lang: string): UseProductReturn => {
  const [result, setResult] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<ProductLoadingKind>("lookup");
  const [error, setError] = useState<string | null>(null);
  const [webSearchFailed, setWebSearchFailed] = useState(false);

  const run = useCallback(async (kind: ProductLoadingKind, barcode: string, call: () => Promise<Product>) => {
    setLoadingKind(kind);
    setLoading(true);
    setError(null);
    try {
      const json = await call();
      setResult({ ...json, barcode });
      if (kind === "web") setWebSearchFailed(json.found === false);
    } catch (e) {
      setError((e as Error).message || "Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProduct = useCallback(
    async (barcode: string) => {
      setResult(null);
      setWebSearchFailed(false);
      await run("lookup", barcode, () => productApi.fetchByBarcode(barcode, lang));
    },
    [lang, run]
  );

  const analyzeLabel = useCallback(
    async (barcode: string, source: PhotoSource) => {
      let uri: string | null;
      try {
        uri = await getPhotoUri(source);
      } catch (e) {
        setError((e as Error).message);
        return;
      }
      if (!uri) return;
      const photo = uri;
      await run("label", barcode, () => productApi.analyzeLabel(barcode, photo, lang));
    },
    [lang, run]
  );

  const searchWeb = useCallback(
    (barcode: string) => run("web", barcode, () => productApi.searchWeb(barcode, lang)),
    [lang, run]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setWebSearchFailed(false);
  }, []);

  return { result, loading, loadingKind, error, webSearchFailed, fetchProduct, analyzeLabel, searchWeb, reset };
};
