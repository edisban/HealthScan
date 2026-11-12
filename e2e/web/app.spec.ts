import { test, expect, Page } from "@playwright/test";

// The exported web app against the running stack (MOCK_AI=1). UPDATE_SCREENSHOTS=1 also saves
// screenshots of each screen to docs/screenshots.
const NUTELLA = "3017620422003";
const UNKNOWN = "2900000017283";

const snap = async (page: Page, name: string) => {
  if (process.env.UPDATE_SCREENSHOTS) {
    await page.screenshot({ path: `../docs/screenshots/${name}.png`, fullPage: true });
  }
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
};

const scan = async (page: Page, barcode: string) => {
  await page.getByTestId("barcode-input").fill(barcode);
  await page.getByTestId("barcode-submit").click();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Start in English, with an empty history
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // The intro covers the app for about 2 seconds after it opens
  await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 10_000 });
  await page.getByRole("button", { name: "Language EN" }).click();
});

test("the intro shows the app name, then reveals the home screen", async ({ page }) => {
  await page.reload();

  await expect(page.getByTestId("intro")).toBeVisible();
  await expect(page.getByTestId("intro").getByText("Health Scan")).toBeVisible();
  await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText("Scan Barcode")).toBeVisible();
});

test("home screen", async ({ page }) => {
  await expect(page.getByText("Know what you eat and use, in seconds.")).toBeVisible();
  await expect(page.getByText("Scan Barcode")).toBeVisible();
  await snap(page, "home");
});

test("scanning a product shows its score, where it comes from and the disclaimer", async ({ page }) => {
  await scan(page, NUTELLA);

  await expect(page.getByText(/nutella/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/official nutrition data/)).toBeVisible();
  await expect(page.getByText(/Nutri-Score [A-E]/)).toBeVisible();
  await expect(page.getByText(/not medical advice/)).toBeVisible();
  await snap(page, "product");
});

test("scanned products appear in the recent scans", async ({ page }) => {
  await scan(page, NUTELLA);
  await expect(page.getByText(/official nutrition data/)).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("home").click();

  await expect(page.getByTestId(`history-${NUTELLA}`)).toBeVisible();
  await snap(page, "history");
});

test("an unknown product leads to the label photo", async ({ page }) => {
  await scan(page, UNKNOWN);

  await expect(page.getByText("Product not found")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Photograph the ingredients")).toBeVisible();
  await snap(page, "not-found");
});

test("the language switch changes the interface", async ({ page }) => {
  await page.getByRole("button", { name: "Language EL" }).click();

  await expect(page.getByText("Σάρωση Barcode")).toBeVisible();
});

test("an invalid barcode shows the error card", async ({ page }) => {
  await scan(page, "123");

  await expect(page.getByTestId("error")).toBeVisible();
  await expect(page.getByText("HTTP 400")).toBeVisible();
});
