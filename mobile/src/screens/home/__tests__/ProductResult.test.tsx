import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@/context/ThemeContext";
import { strings } from "@/constants/strings";
import { light } from "@/constants/theme";
import type { Product } from "@/api/types";
import { ProductResult, processingLabel, scoreBasis, sourceLabel } from "../ProductResult";
import { confidenceLabel } from "../FruitResult";

// Icon fonts are not available in Jest
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const en = strings.en;
const el = strings.el;
const product = (overrides: Partial<Product> = {}): Product =>
  ({
    barcode: "3017620422003",
    name: "Nutella",
    healthScore: 10,
    scoreSource: "Nutri-Score",
    nutriScore: "e",
    novaGroup: 4,
    pros: [],
    cons: [],
    ingredients: [],
    ...overrides,
  }) as Product;

const show = (result: Product, language = en) =>
  render(
    <ThemeProvider>
      <ProductResult result={result} strings={language} theme={light} />
    </ThemeProvider>
  );

it("shows the score, the Nutri-Score letter and the processing level in words", async () => {
  await show(product());

  expect(screen.getByText("10")).toBeTruthy();
  expect(screen.getByText("Nutri-Score E")).toBeTruthy();
  expect(screen.getByText("Ultra-processed")).toBeTruthy();
  expect(screen.getByText(en.scoreFromNutriScore)).toBeTruthy();
  expect(screen.queryByText(/NOVA/)).toBeNull();
  expect(screen.queryByTestId("score-unavailable")).toBeNull();
});

it("tells the user in plain words what the score means", async () => {
  await show(product({ healthScore: 82 }));
  expect(screen.getByText(en.scoreLabelHigh)).toBeTruthy();
});

it("shows no facts row for an AI estimate without data", async () => {
  await show(product({ scoreSource: "AI estimate", nutriScore: "", novaGroup: null }));

  expect(screen.queryByTestId("score-facts")).toBeNull();
  expect(screen.getByText(en.scoreEstimated)).toBeTruthy();
});

it("says the score is unavailable instead of showing 0 when the analysis failed", async () => {
  await show(product({ healthScore: null as unknown as number, scoreSource: "" }));

  expect(screen.getByTestId("score-unavailable")).toBeTruthy();
  expect(screen.getByText(en.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByText("0")).toBeNull();
  expect(screen.queryByTestId("score-facts")).toBeNull();
});

it("translates the app's own sources but keeps database names", async () => {
  await show(product({ source: "Label photo" }), el);
  expect(screen.getByText(el.sourceLabelPhoto)).toBeTruthy();

  expect(sourceLabel("Web search", el)).toBe("Από το διαδίκτυο");
  expect(sourceLabel("Open Food Facts", el)).toBe("Open Food Facts");
});

it("always shows the disclaimer", async () => {
  await show(product());

  expect(screen.getByText(en.disclaimer)).toBeTruthy();
});

it("labels an AI estimate as such", () => {
  expect(scoreBasis(product({ scoreSource: "AI estimate" }), en)).toBe(en.scoreEstimated);
});

it.each([
  [1, "Unprocessed"],
  [2, "Cooking ingredient"],
  [3, "Processed"],
  [4, "Ultra-processed"],
])("NOVA %i reads as %s", (nova, words) => {
  expect(processingLabel(nova, en)).toBe(words);
});

it("an unknown NOVA group shows nothing", () => {
  expect(processingLabel(null, en)).toBe("");
  expect(processingLabel(7, en)).toBe("");
});

it.each([
  [95, "Very sure"],
  [80, "Very sure"],
  [60, "Fairly sure"],
  [30, "Not very sure"],
])("fruit confidence %i%% reads as %s", (confidence, words) => {
  expect(confidenceLabel(confidence, en)).toBe(words);
});
