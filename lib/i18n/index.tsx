"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import ar from "./ar";
import en from "./en";
import type { Dictionary } from "./ar";

export type Lang = "ar" | "en";

interface I18nContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: Dictionary;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "whiskerlog_lang";

const dictionaries: Record<Lang, Dictionary> = { ar, en };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  // Hydrate from localStorage on client
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Lang) || "ar";
    setLangState(stored);
    document.documentElement.lang = stored;
    document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  const value: I18nContextValue = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    t: dictionaries[lang],
    setLang,
    toggleLang,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Convenience shorthand hook — returns the dictionary directly
export function useT(): Dictionary {
  return useI18n().t;
}

// Server-side helper (for metadata, etc.)
export function getDictionary(lang: Lang = "ar"): Dictionary {
  return dictionaries[lang];
}
