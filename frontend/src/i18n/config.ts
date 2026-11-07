// To add a language: add its code and label here, then add messages/<code>.json.
export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookie = "voicecart_locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

export const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);
