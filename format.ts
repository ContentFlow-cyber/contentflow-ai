import type { Currency, Interval, Plan } from "./types";

export function localeTag(locale: string): string {
  return locale === "pt" ? "pt-PT" : "en-US";
}

/** Amount is in minor units (cents). */
export function formatMoney(cents: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(localeTag(locale)).format(n);
}

export function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium" }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function planPrice(plan: Plan, currency: Currency, interval: Interval): number {
  if (currency === "eur") return interval === "month" ? plan.price_eur_month : plan.price_eur_year;
  return interval === "month" ? plan.price_usd_month : plan.price_usd_year;
}
