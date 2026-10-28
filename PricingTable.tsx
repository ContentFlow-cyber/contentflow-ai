"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { formatMoney, formatNumber, planPrice } from "@/lib/format";
import type { CoinPackage, Interval, Plan, PlanId } from "@/lib/types";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Network error. Please try again." } };
  }
}

export function PricingTable({
  plans,
  currentPlan,
  signedIn,
  subscribed = false,
}: {
  plans: Plan[];
  currentPlan?: PlanId;
  signedIn: boolean;
  subscribed?: boolean;
}) {
  const { t, locale, currency } = useI18n();
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(plan: Plan) {
    setMessage(null);
    setBusy(plan.id);
    const { ok, data } = await postJson("/api/stripe/checkout", { kind: "subscription", plan: plan.id, interval, currency });
    setBusy(null);
    if (ok && typeof data.url === "string") {
      window.location.href = data.url;
    } else if (ok && data.updated) {
      setMessage("Plan change requested. It will be applied as soon as Stripe confirms it (usually seconds).");
      setTimeout(() => router.refresh(), 4000);
    } else {
      setMessage(String(data.error ?? t("common.error")));
    }
  }

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {(["month", "year"] as Interval[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${interval === i ? "bg-brand text-white" : "text-muted hover:text-text"}`}
            >
              {i === "month" ? t("price.month") : t("price.year")}
            </button>
          ))}
        </div>
      </div>

      {message && <p className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-center text-sm">{message}</p>}

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const price = planPrice(plan, currency, interval);
          const isCurrent = currentPlan === plan.id;
          const featured = plan.id === "pro";
          return (
            <div key={plan.id} className={`card flex flex-col ${featured ? "border-brand shadow-xl shadow-brand/10" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                {featured && <span className="badge">Popular</span>}
              </div>
              <p className="mt-3 text-4xl font-extrabold tracking-tight">
                {plan.id === "free" ? formatMoney(0, currency, locale) : formatMoney(price, currency, locale)}
                <span className="text-sm font-medium text-muted">
                  {plan.id === "free" ? t("price.perMonth") : interval === "month" ? t("price.perMonth") : t("price.perYear")}
                </span>
              </p>
              <p className="mt-1 text-sm font-semibold text-brand">
                {formatNumber(plan.monthly_coins, locale)} {t("price.coinsPerMonth")}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                    <span>
                      {locale === "pt" ? f.pt : f.en}
                      {f.status === "soon" && <span className="badge-soon ml-2">{t("price.soon")}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.id === "free" ? (
                  isCurrent ? (
                    <span className="btn-secondary w-full cursor-default">{t("price.current")}</span>
                  ) : signedIn ? (
                    <span className="btn-secondary w-full cursor-default opacity-60">{t("price.free")}</span>
                  ) : (
                    <Link href="/signup" className="btn-secondary w-full">{t("nav.start")}</Link>
                  )
                ) : isCurrent ? (
                  <span className="btn-secondary w-full cursor-default">{t("price.current")}</span>
                ) : signedIn ? (
                  <button type="button" className="btn-primary w-full" disabled={busy !== null} onClick={() => choose(plan)}>
                    {busy === plan.id ? t("common.loading") : subscribed ? t("common.upgrade") : t("price.choose")}
                  </button>
                ) : (
                  <Link href="/signup" className="btn-primary w-full">{t("price.choose")}</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        {t("price.note")} {currency.toUpperCase()}.
      </p>
    </div>
  );
}

export function CoinPackages({ packages, signedIn }: { packages: CoinPackage[]; signedIn: boolean }) {
  const { t, locale, currency } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function buy(pack: CoinPackage) {
    setMessage(null);
    setBusy(pack.id);
    const { ok, data } = await postJson("/api/stripe/checkout", { kind: "coins", package_id: pack.id, currency });
    setBusy(null);
    if (ok && typeof data.url === "string") window.location.href = data.url;
    else setMessage(String(data.error ?? t("common.error")));
  }

  return (
    <div>
      {message && <p className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((p) => (
          <div key={p.id} className="card text-center">
            <p className="text-sm font-semibold text-muted">{p.name}</p>
            <p className="mt-2 text-3xl font-extrabold">{formatNumber(p.coins, locale)}</p>
            <p className="text-xs text-muted">{t("common.coins")}</p>
            <p className="mt-3 text-lg font-bold">{formatMoney(currency === "eur" ? p.price_eur : p.price_usd, currency, locale)}</p>
            {signedIn ? (
              <button type="button" className="btn-primary mt-4 w-full" disabled={busy !== null || p.id.startsWith("default-")} onClick={() => buy(p)}>
                {busy === p.id ? t("common.loading") : t("packs.buy")}
              </button>
            ) : (
              <Link href="/signup" className="btn-primary mt-4 w-full">{t("packs.buy")}</Link>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">{t("packs.note")} ({currency.toUpperCase()})</p>
    </div>
  );
}
