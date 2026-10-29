import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { strings, AppStrings } from "@/constants/strings";

interface LanguageContextValue {
  lang: "el" | "en";
  strings: AppStrings;
  setLang: (lang: "el" | "en") => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<"el" | "en">("el");
  const changeLang = useCallback((next: "el" | "en") => setLang(next), []);

  return (
    <LanguageContext.Provider value={{ lang, strings: strings[lang], setLang: changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
