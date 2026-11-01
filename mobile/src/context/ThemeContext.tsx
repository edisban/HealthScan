import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { Theme, light, dark } from "@/constants/theme";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Start from the phone's appearance setting; the toggle overrides it
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system !== "light");
  const theme: Theme = isDark ? dark : light;
  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
