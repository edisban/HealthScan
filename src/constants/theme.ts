export interface Theme {
  mode: "light" | "dark";
  palette: {
    mode: "light" | "dark";
    primary: { main: string; contrastText: string };
    background: {
      default: string[];
      paper: string;
      surface: string;
    };
    text: { primary: string; secondary: string };
    border: string;
    inputBg: string;
    success: { main: string };
    warning: { main: string };
    error: { main: string };
  };
  typography: {
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    body1: { fontSize: number; lineHeight: number };
    body2: { fontSize: number; lineHeight: number };
    caption: { fontSize: number };
  };
  spacing: (factor?: number) => number;
  shape: { borderRadius: number };
  transitions: { duration: { standard: number } };
}

export const createTheme = (mode: "light" | "dark"): Theme => {
  const isDark = mode === "dark";
  const primary = isDark ? "#6366f1" : "#4f46e5";
  return {
    mode,
    palette: {
      mode,
      primary: { main: primary, contrastText: "#fff" },
      background: {
        default: isDark ? ["#1e1b4b", "#312e81"] : ["#eef2ff", "#f8fafc"],
        paper: isDark ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.6)",
        surface: isDark ? "rgba(15,23,42,0.5)" : "rgba(15,23,42,0.3)",
      },
      text: { primary: isDark ? "#f1f5f9" : "#1a1a2e", secondary: isDark ? "#94a3b8" : "#666" },
      border: isDark ? "#475569" : "#ccc",
      inputBg: isDark ? "rgba(15,23,42,0.5)" : "#f9f9f9",
      success: { main: "#27ae60" },
      warning: { main: "#f39c12" },
      error: { main: "#e74c3c" },
    },
    typography: {
      h1: { fontSize: 28, fontWeight: "800" },
      h2: { fontSize: 20, fontWeight: "700" },
      body1: { fontSize: 16, lineHeight: 22 },
      body2: { fontSize: 14, lineHeight: 20 },
      caption: { fontSize: 12 },
    },
    spacing: (factor = 1) => 4 * factor,
    shape: { borderRadius: 12 },
    transitions: { duration: { standard: 300 } },
  };
};

export const light = createTheme("light");
export const dark = createTheme("dark");

export const scoreColor = (score: number): string =>
  score >= 70 ? "#6366f1" : score >= 45 ? "#f39c12" : "#e74c3c";

export const scoreLabel = (score: number): string =>
  score >= 70 ? "Υψηλή Διατροφική Αξία" : score >= 45 ? "Μέτρια Αξία" : "Προσοχή στα Συστατικά";
