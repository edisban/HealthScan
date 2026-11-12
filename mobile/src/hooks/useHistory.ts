import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product } from "@/api/types";

export interface HistoryEntry {
  barcode: string;
  name: string;
  healthScore: number | null;
  scoreSource?: string;
  scannedAt: number;
}

export const HISTORY_KEY = "healthscan.history.v1";
export const HISTORY_LIMIT = 20;

/** Newest first, one entry per barcode, at most HISTORY_LIMIT entries. */
export const addToHistory = (entries: HistoryEntry[], product: Product, now = Date.now()): HistoryEntry[] => {
  const entry: HistoryEntry = {
    barcode: product.barcode,
    name: product.name,
    healthScore: product.healthScore ?? null,
    scoreSource: product.scoreSource,
    scannedAt: now,
  };
  return [entry, ...entries.filter((e) => e.barcode !== product.barcode)].slice(0, HISTORY_LIMIT);
};

/** Recent scans, kept on the device only. Storage errors are ignored: history is a convenience. */
export const useHistory = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : [];
        if (Array.isArray(saved)) setEntries(saved);
      })
      .catch(() => {});
  }, []);

  const save = (next: HistoryEntry[]) => {
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  const add = useCallback((product: Product) => {
    setEntries((current) => save(addToHistory(current, product)));
  }, []);

  const clear = useCallback(() => {
    setEntries(save([]));
  }, []);

  return { entries, add, clear };
};
