import { useState, useCallback, useRef, useEffect } from "react";
import { productApi } from "@/api/products";
import { Product } from "@/api/types";
import { getPhoto, Photo, PhotoSource } from "@/utils/photo";

export type ProductLoadingKind = "lookup" | "label" | "web";

const WEB_SEARCH_TIMEOUT_MS = 45000;

export interface UseProductReturn {
  result: Product | null;
  loading: boolean;
  loadingKind: ProductLoadingKind;
  error: string | null;
  fetchProduct: (barcode: string) => Promise<void>;
  analyzeLabel: (barcode: string, source: PhotoSource) => Promise<void>;
  // Stops the automatic web search and goes straight to the not-found screen
  skipWebSearch: () => void;
  reset: () => void;
}

export const useProduct = (lang: string): UseProductReturn => {
  const [result, setResult] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<ProductLoadingKind>("lookup");
  const [error, setError] = useState<string | null>(null);
  const webSearch = useRef<AbortController | null>(null);

  const run = useCallback(async (kind: ProductLoadingKind, barcode: string, call: () => Promise<Product>) => {
    setLoadingKind(kind);
    setLoading(true);
    setError(null);
    try {
      const json = await call();
      setResult({ ...json, barcode });
    } catch (e) {
      setError((e as Error).message || "Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  // No database knows the barcode: search the web automatically, in the same loading state
  const lookupThenSearch = useCallback(
    async (barcode: string): Promise<Product> => {
      const product = await productApi.fetchByBarcode(barcode, lang);
      if (product.found !== false) return product;

      setLoadingKind("web");
      const controller = new AbortController();
      webSearch.current = controller;
      const timeout = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);
      try {
        return await productApi.searchWeb(barcode, lang, controller.signal);
      } catch {
        // Skipped, timed out or failed: the not-found screen still offers the label photo
        return product;
      } finally {
        clearTimeout(timeout);
        webSearch.current = null;
      }
    },
    [lang]
  );

  const fetchProduct = useCallback(
    async (barcode: string) => {
      setResult(null);
      await run("lookup", barcode, () => lookupThenSearch(barcode));
    },
    [lookupThenSearch, run]
  );

  const analyzeLabel = useCallback(
    async (barcode: string, source: PhotoSource) => {
      let photo: Photo | null;
      try {
        photo = await getPhoto(source);
      } catch (e) {
        setError((e as Error).message);
        return;
      }
      if (!photo) return;
      const { dataUrl } = photo;
      await run("label", barcode, () => productApi.analyzeLabel(barcode, dataUrl, lang));
    },
    [lang, run]
  );

  // A language switch while a product is shown fetches its analysis again in the new language
  const shownLang = useRef(lang);
  useEffect(() => {
    if (shownLang.current === lang) return;
    shownLang.current = lang;
    if (result && result.found !== false && !loading) fetchProduct(result.barcode);
  }, [lang]);

  const skipWebSearch = useCallback(() => webSearch.current?.abort(), []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, loadingKind, error, fetchProduct, analyzeLabel, skipWebSearch, reset };
};
