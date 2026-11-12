const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const okResponse = { ok: true, status: 200, json: async () => ({ found: true }) };

// Loads the client against a given API key, the way the bundler would inline EXPO_PUBLIC_API_KEY
const loadClient = (apiKey: string) => {
  let client: typeof import("../client") | undefined;
  jest.isolateModules(() => {
    jest.doMock("@/constants/api", () => ({ API_BASE: "http://backend:8080", API_KEY: apiKey }));
    client = require("../client");
  });
  return client!;
};

const sentHeaders = (): Record<string, string> => fetchMock.mock.calls[0][1].headers;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(okResponse);
});

it("sends the API key when one is configured", async () => {
  const { request, API_KEY_HEADER } = loadClient("app-key");

  await request("/api/v1/product/5201234567890");

  expect(fetchMock).toHaveBeenCalledWith("http://backend:8080/api/v1/product/5201234567890", expect.anything());
  expect(sentHeaders()[API_KEY_HEADER]).toBe("app-key");
});

it("sends no API key header when none is configured", async () => {
  const { request, API_KEY_HEADER } = loadClient("");

  await request("/api/v1/product/5201234567890");

  expect(sentHeaders()).not.toHaveProperty(API_KEY_HEADER);
});

it("keeps the JSON content type and the method", async () => {
  const { request } = loadClient("app-key");

  await request("/api/v1/analyze-image-base64", { method: "POST", body: "{}" });

  expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  expect(sentHeaders()["Content-Type"]).toBe("application/json");
});

it.each([400, 401, 413, 429])("turns HTTP %i into an error", async (status) => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({}) });
  const { request } = loadClient("");

  await expect(request("/api/v1/product/5201234567890")).rejects.toThrow(`HTTP ${status}`);
});
