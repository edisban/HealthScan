import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HomeScreen } from "@/screens/HomeScreen";

// Status bar text follows the app theme, not the phone's setting
const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HomeScreen />
        <ThemedStatusBar />
      </LanguageProvider>
    </ThemeProvider>
  );
}
