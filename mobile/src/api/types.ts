export interface Product {
  barcode: string;
  name: string;
  healthScore: number;
  explanation?: string;
  summary?: string;
  origin?: string;
  nutrition?: string;
  imageUrl?: string;
  pros: string[];
  ingredients: string[];
  cons: string[];
  // false when no database (or label/web fallback) identified the barcode
  found?: boolean;
  // e.g. "Open Food Facts", "Label photo", "Web search"
  source?: string;
  // "Nutri-Score" when the score is calculated from Open Food Facts data, "AI estimate" otherwise
  scoreSource?: string;
  nutriScore?: string;
  novaGroup?: number | null;
}

export interface ApiError extends Error {
  status?: number;
}
