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
}

export interface ApiError extends Error {
  status?: number;
}
