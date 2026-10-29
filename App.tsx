import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HomeScreen } from "@/screens/HomeScreen";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HomeScreen />
        <StatusBar style="auto" />
      </LanguageProvider>
    </ThemeProvider>
  );
}
