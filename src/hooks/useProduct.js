import { useState } from "react";

const API_BASE = "http://192.168.1.1:8080";

export function useProduct(lang) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = async (barcode) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/product/${barcode}?lang=${lang}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResult({ barcode, ...json });
    } catch (e) {
      setError(e.message || "Σφάλμα σύνδεσης");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(null); };

  return { result, loading, error, fetchProduct, reset };
}
