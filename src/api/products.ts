import { request } from "./client";
import { productPath } from "@/constants/api";
import { Product } from "./types";

export const productApi = {
  fetchByBarcode: (barcode: string, lang: string): Promise<Product> =>
    request(productPath(barcode, lang)),
};
