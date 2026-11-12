export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:8080";
// Optional; must match the backend's API_KEY. It ships inside the app, so it deters abuse but is not real auth.
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";
export const productPath = (barcode: string, lang: string) => `/api/v1/product/${barcode}?lang=${lang}`;
