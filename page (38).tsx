import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlans, getSubscription, getWallet } from "@/lib/wallet";
import { PricingTable } from "@/components/PricingTable";
import { BillingActions } from "@/components/dashboard/BillingActions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Currency, PlanId } from "@/lib/types";

export const metadata: Metadata = { title: "Billing" };

interface PaymentRow { id: string; kind: string; amount: number; currency: string | null; coins: number; created_at: string }

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [wallet, plans, sub, payments] = await Promise.all([
    getWallet(user!.id, admin),
    getPlans(admin),
    getSubscription(supabase, user!.id),
    supabase.from("payments").select("id,kind,amount,currency,coins,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const current = plans.find((p) => p.id === wallet.plan_id);
  const subscribed = Boolean(sub && ["active", "trialing", "past_due"].includes(sub.status));
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("billing.title")}</h1>

      {!stripeReady && <p className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">{t("billing.notConfigured")} (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)</p>}
      {checkout === "success" && (
        <p className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm">
          {locale === "pt"
            ? "Pagamento recebido. O plano é atualizado assim que o Stripe confirma (normalmente em segundos). Atualize a página se ainda não mudou."
            : "Payment received. Your plan updates as soon as Stripe confirms it (usually within seconds). Refresh if it has not changed yet."}
        </p>
      )}
      {checkout === "cancelled" && <p className="rounded-xl border border-border bg-surface2 p-3 text-sm">{locale === "pt" ? "Checkout cancelado. Não foi cobrado nada." : "Checkout cancelled. You were not charged."}</p>}

      <div className="card space-y-2">
        <p className="label">{t("dash.plan")}</p>
        <p className="text-3xl font-extrabold">{current?.name ?? wallet.plan_id}</p>
        {subscribed && sub && (
          <p className="text-sm text-muted">
            {t("billing.status")}: <strong className="text-text">{sub.status}</strong> · {sub.interval === "year" ? t("price.year") : t("price.month")}
            {sub.currency ? ` · ${sub.currency.toUpperCase()}` : ""} ·{" "}
            {sub.cancel_at_period_end
              ? `${locale === "pt" ? "Termina em" : "Ends on"} ${formatDate(sub.current_period_end, locale)}`
              : `${t("billing.renewal")}: ${formatDate(sub.current_period_end, locale)}`}
          </p>
        )}
        {sub?.status === "past_due" && <p className="text-sm text-danger">{locale === "pt" ? "O último pagamento falhou. Atualize o método de pagamento." : "Your last payment failed. Please update your payment method."}</p>}
        <BillingActions hasCustomer={Boolean(sub?.stripe_customer_id)} hasSubscription={subscribed} cancelAtPeriodEnd={Boolean(sub?.cancel_at_period_end)} />
      </div>

      <PricingTable plans={plans}currentPlan={wallet.plan_id as PlanId} signedIn subscribed={subscribed} />

      <section>
        <h2 className="mb-3 font-bold">{t("billing.history")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <tbody>
              {((payments.data ?? []) as PaymentRow[]).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-muted">{formatDateTime(p.created_at, locale)}</td>
                  <td className="px-4 py-2.5">{p.kind === "coins" ? `${p.coins} ${t("common.coins")}` : locale === "pt" ? "Subscrição" : "Subscription"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{p.currency ? formatMoney(p.amount, p.currency as Currency, locale) : "—"}</td>
                </tr>
              ))}
              {!payments.data?.length && <tr><td className="px-4 py-6 text-center text-muted">{t("dash.none")}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">{locale === "pt" ? "Faturas completas e métodos de pagamento: use “Gerir métodos de pagamento e faturas”." : "Full invoices and payment methods: use “Manage payment methods & invoices”."}</p>
      </section>
    </div>
  );
}
