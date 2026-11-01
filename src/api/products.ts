import { request } from "./client";
import { productPath } from "@/constants/api";
import { uriToBase64 } from "@/utils/photo";
import { Product } from "./types";

export const productApi = {
  fetchByBarcode: (barcode: string, lang: string): Promise<Product> =>
    request(productPath(barcode, lang)),

  // Fallbacks for barcodes no product database knows
  analyzeLabel: async (barcode: string, uri: string, lang: string): Promise<Product> =>
    request(`/api/v1/product/${barcode}/label?lang=${lang}`, {
      method: "POST",
      body: JSON.stringify({ image: await uriToBase64(uri) }),
    }),

  searchWeb: (barcode: string, lang: string): Promise<Product> =>
    request(`/api/v1/product/${barcode}/web-search?lang=${lang}`, { method: "POST" }),
};
