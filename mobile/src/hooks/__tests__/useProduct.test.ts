import { act, renderHook, waitFor } from "@testing-library/react-native";
import { productApi } from "@/api/products";
import { Product } from "@/api/types";
import { getPhoto } from "@/utils/photo";
import { useProduct } from "../useProduct";

jest.mock("@/api/products", () => ({
  productApi: { fetchByBarcode: jest.fn(), analyzeLabel: jest.fn(), searchWeb: jest.fn() },
}));
jest.mock("@/utils/photo", () => ({ getPhoto: jest.fn() }));

const api = jest.mocked(productApi);
const photo = jest.mocked(getPhoto);

const BARCODE = "5201234567890";
const product = { name: "Yogurt", healthScore: 72, found: true, source: "Open Food Facts" } as Product;
const webProduct = { ...product, source: "Web search" } as Product;
const notFound = { name: "", found: false } as Product;

// A web search that stays open until the hook aborts it, like a slow real request
const hangingSearch = (_barcode: string, _lang: string, signal?: AbortSignal) =>
  new Promise<Product>((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(new Error("Aborted")));
  });

const setup = () => renderHook(() => useProduct("en"));

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("fetchProduct", () => {
  it("does not search the web for a known product", async () => {
    api.fetchByBarcode.mockResolvedValue(product);
    const { result } = await setup();

    await act(() => result.current.fetchProduct(BARCODE));

    expect(result.current.result).toEqual({ ...product, barcode: BARCODE });
    expect(api.searchWeb).not.toHaveBeenCalled();
  });

  it("searches the web automatically when every database misses", async () => {
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockResolvedValue(webProduct);
    const { result } = await setup();

    await act(() => result.current.fetchProduct(BARCODE));

    expect(api.searchWeb).toHaveBeenCalledWith(BARCODE, "en", expect.any(AbortSignal));
    expect(result.current.result?.source).toBe("Web search");
    expect(result.current.loading).toBe(false);
  });

  it("stays in a loading state labelled as a web search while searching", async () => {
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockImplementation(hangingSearch);
    const { result } = await setup();

    await act(async () => {
      void result.current.fetchProduct(BARCODE);
    });

    await waitFor(() => expect(result.current.loadingKind).toBe("web"));
    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBeNull();

    await act(async () => result.current.skipWebSearch());
  });

  it("shows not found when the web has no match", async () => {
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockResolvedValue(notFound);
    const { result } = await setup();

    await act(() => result.current.fetchProduct(BARCODE));

    expect(result.current.result?.found).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("shows not found, not an error, when the web search fails", async () => {
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockRejectedValue(new Error("HTTP 500"));
    const { result } = await setup();

    await act(() => result.current.fetchProduct(BARCODE));

    expect(result.current.result).toEqual({ ...notFound, barcode: BARCODE });
    expect(result.current.error).toBeNull();
  });

  it("lets the user skip the web search", async () => {
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockImplementation(hangingSearch);
    const { result } = await setup();

    await act(async () => {
      void result.current.fetchProduct(BARCODE);
    });
    await waitFor(() => expect(result.current.loadingKind).toBe("web"));
    await act(async () => result.current.skipWebSearch());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result?.found).toBe(false);
  });

  it("gives up on the web search after 45 seconds", async () => {
    jest.useFakeTimers();
    api.fetchByBarcode.mockResolvedValue(notFound);
    api.searchWeb.mockImplementation(hangingSearch);
    const { result } = await setup();

    await act(async () => {
      void result.current.fetchProduct(BARCODE);
      await jest.advanceTimersByTimeAsync(44999);
    });
    expect(result.current.loading).toBe(true);

    await act(() => jest.advanceTimersByTimeAsync(1));

    expect(result.current.loading).toBe(false);
    expect(result.current.result?.found).toBe(false);
  });

  it("reports a failed lookup and does not search the web", async () => {
    api.fetchByBarcode.mockRejectedValue(new Error("HTTP 500"));
    const { result } = await setup();

    await act(() => result.current.fetchProduct(BARCODE));

    expect(result.current.error).toBe("HTTP 500");
    expect(result.current.result).toBeNull();
    expect(api.searchWeb).not.toHaveBeenCalled();
  });

  it("sends the current language", async () => {
    api.fetchByBarcode.mockResolvedValue(product);
    const { result } = await renderHook(() => useProduct("el"));

    await act(() => result.current.fetchProduct(BARCODE));

    expect(api.fetchByBarcode).toHaveBeenCalledWith(BARCODE, "el");
  });
});

describe("analyzeLabel", () => {
  it("sends the photo and shows the result", async () => {
    photo.mockResolvedValue({ uri: "file://a.jpg", dataUrl: "data:image/jpeg;base64,AAA" });
    api.analyzeLabel.mockResolvedValue({ ...product, source: "Label photo" });
    const { result } = await setup();

    await act(() => result.current.analyzeLabel(BARCODE, "camera"));

    expect(api.analyzeLabel).toHaveBeenCalledWith(BARCODE, "data:image/jpeg;base64,AAA", "en");
    expect(result.current.result?.source).toBe("Label photo");
  });

  it("does nothing when the user cancels the picker", async () => {
    photo.mockResolvedValue(null);
    const { result } = await setup();

    await act(() => result.current.analyzeLabel(BARCODE, "library"));

    expect(api.analyzeLabel).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("reports a denied permission", async () => {
    photo.mockRejectedValue(new Error("Camera permission required"));
    const { result } = await setup();

    await act(() => result.current.analyzeLabel(BARCODE, "camera"));

    expect(result.current.error).toBe("Camera permission required");
  });
});

it("reset clears the result and the error", async () => {
  api.fetchByBarcode.mockResolvedValue(product);
  const { result } = await setup();
  await act(() => result.current.fetchProduct(BARCODE));

  await act(async () => result.current.reset());

  expect(result.current.result).toBeNull();
  expect(result.current.error).toBeNull();
});
