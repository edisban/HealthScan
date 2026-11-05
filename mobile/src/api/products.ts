import { request } from "./client";
import { productPath } from "@/constants/api";
import { Product } from "./types";

export const productApi = {
  fetchByBarcode: (barcode: string, lang: string): Promise<Product> =>
    request(productPath(barcode, lang)),

  // Fallbacks for barcodes no product database knows
  analyzeLabel: (barcode: string, dataUrl: string, lang: string): Promise<Product> =>
    request(`/api/v1/product/${barcode}/label?lang=${lang}`, {
      method: "POST",
      body: JSON.stringify({ image: dataUrl }),
    }),

  searchWeb: (barcode: string, lang: string, signal?: AbortSignal): Promise<Product> =>
    request(`/api/v1/product/${barcode}/web-search?lang=${lang}`, { method: "POST", signal }),
};
