import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "@/api/types";
import { addToHistory, HISTORY_KEY, HISTORY_LIMIT, HistoryEntry, useHistory } from "../useHistory";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const product = (barcode: string, healthScore = 72): Product =>
  ({ barcode, name: `Product ${barcode}`, healthScore, scoreSource: "Nutri-Score", pros: [], cons: [], ingredients: [] }) as Product;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("addToHistory", () => {
  it("puts the newest scan first", () => {
    const entries = addToHistory(addToHistory([], product("111"), 1), product("222"), 2);

    expect(entries.map((e) => e.barcode)).toEqual(["222", "111"]);
  });

  it("keeps one entry per barcode, moved to the top", () => {
    let entries: HistoryEntry[] = [];
    for (const barcode of ["111", "222", "111"]) entries = addToHistory(entries, product(barcode));

    expect(entries.map((e) => e.barcode)).toEqual(["111", "222"]);
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, () => {
    let entries: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) entries = addToHistory(entries, product(String(10000000 + i)));

    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0].barcode).toBe(String(10000000 + HISTORY_LIMIT + 4));
  });

  it("stores the score and where it came from", () => {
    const [entry] = addToHistory([], product("111", 39), 1234);

    expect(entry).toEqual({ barcode: "111", name: "Product 111", healthScore: 39, scoreSource: "Nutri-Score", scannedAt: 1234 });
  });
});

describe("useHistory", () => {
  it("loads saved scans and saves new ones on the device", async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(addToHistory([], product("111"))));
    const { result } = await renderHook(() => useHistory());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => result.current.add(product("222")));

    expect(result.current.entries.map((e) => e.barcode)).toEqual(["222", "111"]);
    const saved = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? "[]");
    expect(saved.map((e: HistoryEntry) => e.barcode)).toEqual(["222", "111"]);
  });

  it("clears the history", async () => {
    const { result } = await renderHook(() => useHistory());
    await act(async () => result.current.add(product("111")));

    await act(async () => result.current.clear());

    expect(result.current.entries).toEqual([]);
    expect(JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? "null")).toEqual([]);
  });

  it("starts empty when the saved data is unreadable", async () => {
    await AsyncStorage.setItem(HISTORY_KEY, "not json");
    const { result } = await renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.entries).toEqual([]);
  });
});
