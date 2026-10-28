"use client";

import { createContext, useContext, useMemo } from "react";
import { DICTS, translate, type Locale } from "@/lib/i18n";
import type { Currency } from "@/lib/types";

interface Ctx {
  locale: Locale;
  currency: Currency;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<Ctx>({
  locale: "en",
  currency: "usd",
  t: (k) => DICTS.en[k] ?? k,
});

export function I18nProvider({
  locale,
  currency,
  children,
}: {
  locale: Locale;
  currency: Currency;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(
    () => ({ locale, currency, t: (k, v) => translate(locale, k, v) }),
    [locale, currency],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
