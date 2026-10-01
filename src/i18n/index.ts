import { ar } from "./ar";
import { fr } from "./fr";

export const LANGUAGES = { ar, fr } as const;
export type LanguageCode = keyof typeof LANGUAGES;

const STORAGE_KEY = "dzair-store-language";

export function getLanguage(): LanguageCode {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(STORAGE_KEY) === "fr" ? "fr" : "ar";
}

export function setLanguage(language: LanguageCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  document.documentElement.dir = LANGUAGES[language].dir;
}
