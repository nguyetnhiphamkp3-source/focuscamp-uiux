"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DICT, Locale, TranslationKey, tSync } from "@/lib/locale";

interface LocaleContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "vi",
  t: (key) => tSync(key, "vi"),
  toggleLocale: () => {},
});

export function LocaleProvider({
  children,
  initialLocale = "vi",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  /* Sync from localStorage on mount (client-only, after hydration) */
  useEffect(() => {
    const saved = localStorage.getItem("fc-locale") as Locale | null;
    if (saved && saved !== locale) setLocale(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === "vi" ? "en" : "vi";
    setLocale(next);
    localStorage.setItem("fc-locale", next);
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    /* Reload so server components re-render with the new locale cookie */
    window.location.reload();
  }, [locale]);

  const tFn = useCallback(
    (key: TranslationKey): string => tSync(key, locale),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, t: tFn, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
