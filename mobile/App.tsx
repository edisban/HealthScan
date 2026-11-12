import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HomeScreen } from "@/screens/HomeScreen";
import { Intro } from "@/components/Intro";

// Status bar text follows the app theme, not the phone's setting
const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  return (
    <ThemeProvider>
      <LanguageProvider>
        {/* The home screen loads underneath, so it is ready when the intro fades out */}
        <HomeScreen />
        {showIntro && <Intro onDone={() => setShowIntro(false)} />}
        <ThemedStatusBar />
      </LanguageProvider>
    </ThemeProvider>
  );
}
