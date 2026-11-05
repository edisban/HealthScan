import { act, renderHook } from "@testing-library/react-native";
import { imageApi } from "@/api/image";
import { useImageAnalysis } from "../useImageAnalysis";

jest.mock("@/api/image", () => ({ imageApi: { analyzeImage: jest.fn() } }));
jest.mock("@/utils/photo", () => ({ getPhoto: jest.fn() }));

const api = jest.mocked(imageApi);

const photo = { uri: "file://a.jpg", dataUrl: "data:image/jpeg;base64,AAA" };

beforeEach(() => {
  jest.resetAllMocks();
});

it("keeps what the photo shows when it is not a fruit", async () => {
  api.analyzeImage.mockResolvedValue({
    fruitDetected: false,
    fruitName: "",
    detectedObject: "cell phone",
    quality: "uncertain",
    confidence: 0,
    summary: "Not a fruit. Detected: cell phone",
  });
  const { result } = await renderHook(() => useImageAnalysis());

  await act(() => result.current.analyzePhoto(photo));

  expect(result.current.result?.detectedObject).toBe("cell phone");
  expect(result.current.result?.imageUri).toBe(photo.uri);
});

it("reports a failed analysis", async () => {
  api.analyzeImage.mockRejectedValue(new Error("HTTP 500"));
  const { result } = await renderHook(() => useImageAnalysis());

  await act(() => result.current.analyzePhoto(photo));

  expect(result.current.error).toBe("HTTP 500");
  expect(result.current.result).toBeNull();
});
