import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { KIDO_LANGUAGE_KEY, type KidoLanguage } from "./language-preferences";

type LanguageContextValue = {
  language: KidoLanguage;
  setLanguage: (language: KidoLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "EN",
  setLanguage: () => undefined,
});

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setCurrentLanguage] = useState<KidoLanguage>("EN");

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(KIDO_LANGUAGE_KEY).then((stored) => {
      if (mounted && (stored === "EN" || stored === "SW")) setCurrentLanguage(stored);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback((next: KidoLanguage) => {
    setCurrentLanguage(next);
    void AsyncStorage.setItem(KIDO_LANGUAGE_KEY, next).catch(() => undefined);
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export const useKidoLanguage = () => useContext(LanguageContext);
