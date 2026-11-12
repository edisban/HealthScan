import { test, expect } from "@playwright/test";
import { API_KEY } from "../playwright.config";

// Black-box tests against the running backend, started with MOCK_AI=1 and API_KEY set.
// Ordered: the functional checks first, the rate-limit check last, because it uses up the budget.
test.describe.configure({ mode: "serial" });

const NUTELLA = "3017620422003";
const UNKNOWN = "2900000017283";
const auth = { "X-Api-Key": API_KEY };
// A 1x1 JPEG
const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

test.describe("product", () => {
  test("a known barcode gets a score calculated from Nutri-Score", async ({ request }) => {
    const response = await request.get(`/api/v1/product/${NUTELLA}?lang=en`, { headers: auth });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.found).toBe(true);
    expect(body.scoreSource).toBe("Nutri-Score");
    expect(body.healthScore).toBeGreaterThanOrEqual(0);
    expect(body.healthScore).toBeLessThanOrEqual(100);
  });

  test("the fruit check answers through the AI service", async ({ request }) => {
    const response = await request.post("/api/v1/analyze-image-base64", {
      headers: auth,
      data: { image: `data:image/jpeg;base64,${TINY_JPEG}` },
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).fruitDetected).toBe(true);
  });

  test("an unknown barcode is not found", async ({ request }) => {
    const response = await request.post(`/api/v1/product/${UNKNOWN}/web-search?lang=en`, { headers: auth });

    expect(response.status()).toBe(200);
    expect((await response.json()).found).toBe(false);
  });

  test("errors are problem JSON", async ({ request }) => {
    const response = await request.get("/api/v1/product/abc", { headers: auth });

    expect(response.headers()["content-type"]).toContain("application/problem+json");
    expect(await response.json()).toMatchObject({ status: 400, title: "Bad Request" });
  });
});

test.describe("security", () => {
  test("401 without an API key", async ({ request }) => {
    expect((await request.get(`/api/v1/product/${NUTELLA}`)).status()).toBe(401);
  });

  test("401 with a wrong API key", async ({ request }) => {
    const response = await request.get(`/api/v1/product/${NUTELLA}`, { headers: { "X-Api-Key": "wrong" } });

    expect(response.status()).toBe(401);
  });

  for (const barcode of ["1234567", "123456789012345", "ABC12345"]) {
    test(`400 for barcode ${barcode}`, async ({ request }) => {
      expect((await request.get(`/api/v1/product/${barcode}`, { headers: auth })).status()).toBe(400);
    });
  }

  test("400 for an unsupported language", async ({ request }) => {
    expect((await request.get(`/api/v1/product/${NUTELLA}?lang=fr`, { headers: auth })).status()).toBe(400);
  });

  test("400 for an image that is not base64", async ({ request }) => {
    const response = await request.post("/api/v1/analyze-image-base64", { headers: auth, data: { image: "@@@" } });

    expect(response.status()).toBe(400);
  });

  test("413 for an image over 8 MB", async ({ request }) => {
    const response = await request.post("/api/v1/analyze-image-base64", {
      headers: { ...auth, "Content-Type": "application/json" },
      data: JSON.stringify({ image: "A".repeat(9 * 1024 * 1024) }),
      timeout: 30_000,
    });

    expect(response.status()).toBe(413);
  });

  test("the AI service and the database are not reachable from outside", async ({ request }) => {
    for (const port of [8000, 5432]) {
      const reached = await request
        .get(`http://127.0.0.1:${port}/health`, { timeout: 3_000 })
        .then((r) => r.status() === 200)
        .catch(() => false);
      expect(reached, `port ${port}`).toBe(false);
    }
  });

  test("429 with Retry-After once the Groq endpoints' limit is used up", async ({ request }) => {
    // An invalid barcode is rejected with 400 without calling Groq, but still counts toward the limit.
    // Each request claims another client address: only the HTTPS proxy may set it, so it changes nothing.
    const fromSpoofedClient = (i: number) =>
      request.post("/api/v1/product/abc/web-search", { headers: { ...auth, "X-Forwarded-For": `203.0.113.${i}` } });
    let response = await fromSpoofedClient(0);
    for (let i = 1; i <= 30 && response.status() !== 429; i++) {
      response = await fromSpoofedClient(i);
    }

    expect(response.status()).toBe(429);
    expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
  });
});
