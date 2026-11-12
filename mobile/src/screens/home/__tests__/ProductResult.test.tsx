import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@/context/ThemeContext";
import { strings } from "@/constants/strings";
import { light } from "@/constants/theme";
import type { Product } from "@/api/types";
import { ProductResult, scoreBasis } from "../ProductResult";

// Icon fonts are not available in Jest
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const en = strings.en;
const product = (overrides: Partial<Product> = {}): Product =>
  ({
    barcode: "3017620422003",
    name: "Nutella",
    healthScore: 10,
    scoreSource: "Nutri-Score",
    nutriScore: "e",
    novaGroup: 3,
    pros: [],
    cons: [],
    ingredients: [],
    ...overrides,
  }) as Product;

const show = (result: Product) =>
  render(
    <ThemeProvider>
      <ProductResult result={result} strings={en} theme={light} />
    </ThemeProvider>
  );

it("shows the score and where it comes from", async () => {
  await show(product());

  expect(screen.getByText("10")).toBeTruthy();
  expect(screen.getByText("Calculated from Nutri-Score E · NOVA 3")).toBeTruthy();
  expect(screen.queryByTestId("score-unavailable")).toBeNull();
});

it("says the score is unavailable instead of showing 0 when the analysis failed", async () => {
  await show(product({ healthScore: null as unknown as number, scoreSource: "" }));

  expect(screen.getByTestId("score-unavailable")).toBeTruthy();
  expect(screen.getByText(en.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByText("0")).toBeNull();
});

it("always shows the disclaimer", async () => {
  await show(product());

  expect(screen.getByText(en.disclaimer)).toBeTruthy();
});

it("labels an AI estimate as such", () => {
  expect(scoreBasis(product({ scoreSource: "AI estimate" }), en)).toBe(en.scoreEstimated);
});
