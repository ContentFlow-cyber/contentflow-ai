import { cookies, headers } from "next/headers";
import { normalizeLocale, translate, type Locale } from "./i18n";
import type { Currency } from "./types";

export interface I18nServer {
  locale: Locale;
  currency: Currency;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export async function getI18n(): Promise<I18nServer> {
  const store = await cookies();
  const langCookie = store.get("lang")?.value;
  let locale: Locale;
  if (langCookie) {
    locale = normalizeLocale(langCookie);
  } else {
    const accept = (await headers()).get("accept-language") ?? "";
    locale = normalizeLocale(accept);
  }
  const curCookie = store.get("cur")?.value;
  const currency: Currency = curCookie === "usd" || curCookie === "eur" ? curCookie : locale === "en" ? "usd" : "eur";
  return { locale, currency, t: (k, v) => translate(locale, k, v) };
}
