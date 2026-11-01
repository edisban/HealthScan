export interface Theme {
  mode: "light" | "dark";
  palette: {
    mode: "light" | "dark";
    primary: { main: string; dark: string; contrastText: string };
    accent: { main: string; dark: string };
    background: {
      default: string[];
      paper: string;
      surface: string;
    };
    // Soft color glows behind the glass; the blur needs something colorful to show
    orbs: [string, string, string];
    glass: { fill: string; border: string; sheen: string; tint: "light" | "dark" };
    text: { primary: string; secondary: string; muted: string };
    border: string;
    inputBg: string;
    success: { main: string; soft: string };
    warning: { main: string; soft: string };
    error: { main: string; soft: string };
  };
  spacing: (factor?: number) => number;
  shape: { borderRadius: number };
}

export const createTheme = (mode: "light" | "dark"): Theme => {
  const isDark = mode === "dark";
  return {
    mode,
    palette: {
      mode,
      primary: { main: "#10b981", dark: "#059669", contrastText: "#ffffff" },
      accent: { main: "#8b5cf6", dark: "#6d28d9" },
      background: {
        default: isDark ? ["#070b18", "#0f1630", "#0a1a24"] : ["#eef2ff", "#f5f7fb", "#ecfdf5"],
        paper: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
        surface: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.45)",
      },
      orbs: isDark ? ["#10b981", "#8b5cf6", "#06b6d4"] : ["#6ee7b7", "#c4b5fd", "#67e8f9"],
      glass: {
        fill: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
        border: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)",
        sheen: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
        tint: isDark ? "dark" : "light",
      },
      text: {
        primary: isDark ? "#f8fafc" : "#0f172a",
        secondary: isDark ? "#b4bdd0" : "#475569",
        muted: isDark ? "#7d879c" : "#94a3b8",
      },
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      inputBg: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.8)",
      success: { main: "#22c55e", soft: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)" },
      warning: { main: "#f59e0b", soft: isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.12)" },
      error: { main: "#ef4444", soft: isDark ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.1)" },
    },
    spacing: (factor = 1) => 4 * factor,
    shape: { borderRadius: 24 },
  };
};

export const light = createTheme("light");
export const dark = createTheme("dark");

export const scoreColor = (score: number): string =>
  score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
