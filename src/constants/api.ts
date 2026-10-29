export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://192.168.1.1:8080";
export const productPath = (barcode: string, lang: string) => `/api/v1/product/${barcode}?lang=${lang}`;
