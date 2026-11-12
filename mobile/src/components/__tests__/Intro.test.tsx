import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Intro, INTRO_MS } from "../Intro";

// Icon fonts are not available in Jest
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const show = (onDone: () => void) =>
  render(
    <ThemeProvider>
      <LanguageProvider>
        <Intro onDone={onDone} />
      </LanguageProvider>
    </ThemeProvider>
  );

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("shows the app name and tagline", async () => {
  await show(jest.fn());

  expect(screen.getByText("Health Scan")).toBeTruthy();
  expect(screen.getByText("Know what you eat and use, in seconds.")).toBeTruthy();
});

it("finishes by itself after the intro time", async () => {
  const onDone = jest.fn();
  await show(onDone);

  await act(() => jest.advanceTimersByTimeAsync(INTRO_MS - 1));
  expect(onDone).not.toHaveBeenCalled();

  await act(() => jest.advanceTimersByTimeAsync(1));
  expect(onDone).toHaveBeenCalledTimes(1);
});

it("a tap skips it, and it finishes only once", async () => {
  const onDone = jest.fn();
  await show(onDone);

  await fireEvent.press(screen.getByLabelText("Health Scan"));
  // Finished straight away, without waiting for the timer
  expect(onDone).toHaveBeenCalledTimes(1);

  await act(() => jest.advanceTimersByTimeAsync(INTRO_MS));
  expect(onDone).toHaveBeenCalledTimes(1);
});
