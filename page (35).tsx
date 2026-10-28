import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { coinsUsedThisMonth, getPackages, getToolCosts, getWallet, monthStartIso } from "@/lib/wallet";
import { CoinPackages } from "@/components/PricingTable";
import { TOOL_BY_ID, pick } from "@/lib/tool-meta";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { LedgerRow } from "@/lib/types";

export const metadata: Metadata = { title: "Coins" };

function reasonLabel(reason: string, locale: string): string {
  const [kind, tool] = reason.split(":");
  const toolName = tool && TOOL_BY_ID[tool] ? pick(TOOL_BY_ID[tool].label, locale) : tool;
  const pt = locale === "pt";
  switch (kind) {
    case "spend": return `${pt ? "Criação" : "Creation"}: ${toolName}`;
    case "refund": return `${pt ? "Devolução" : "Refund"}: ${toolName}`;
    case "plan_renewal": return pt ? "Moedas mensais do plano" : "Monthly plan coins";
    case "plan_expiry": return pt ? "Moedas do plano expiradas" : "Plan coins expired";
    case "purchase": return pt ? "Compra de moedas" : "Coin purchase";
    case "admin_adjustment": return pt ? "Ajuste do administrador" : "Admin adjustment";
    default: return reason;
  }
}

export default async function CoinsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [wallet, costs, packages, used, ledger, monthLedger] = await Promise.all([
    getWallet(user!.id, admin),
    getToolCosts(admin),
    getPackages(admin),
    coinsUsedThisMonth(supabase, user!.id),
    supabase.from("coin_ledger").select("id,delta,bucket,reason,balance_after,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("coin_ledger").select("delta,reason").gte("created_at", monthStartIso()),
  ]);

  const received = (monthLedger.data ?? []).filter((r: { delta: number }) => r.delta > 0).reduce((s: number, r: { delta: number }) => s + r.delta, 0);
  const byTool = new Map<string, number>();
  for (const r of (monthLedger.data ?? []) as { delta: number; reason: string }[]) {
    if (r.reason.startsWith("spend:") || r.reason.startsWith("refund:")) {
      const tool = r.reason.split(":")[1];
      byTool.set(tool, (byTool.get(tool) ?? 0) - r.delta);
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("side.coins")}</h1>

      {checkout === "success" && (
        <p className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm">
          {locale === "pt"
            ? "Pagamento recebido. As moedas são adicionadas assim que o Stripe confirma o pagamento (normalmente em segundos). Atualize a página se ainda não aparecerem."
            : "Payment received. Coins are added as soon as Stripe confirms the payment (usually within seconds). Refresh if they have not appeared yet."}
        </p>
      )}
      {checkout === "cancelled" && <p className="rounded-xl border border-border bg-surface2 p-3 text-sm">{locale === "pt" ? "Compra cancelada. Não foi cobrado nada." : "Purchase cancelled. You were not charged."}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="label">{t("dash.balance")}</p><p className="text-3xl font-extrabold">{formatNumber(wallet.total, locale)}</p></div>
        <div className="card">
          <p className="label">{locale === "pt" ? "Moedas do plano" : "Plan coins"}</p>
          <p className="text-3xl font-extrabold">{formatNumber(wallet.plan_coins, locale)}</p>
          <p className="mt-1 text-xs text-muted">{locale === "pt" ? "Expiram em" : "Expire on"} {formatDate(wallet.expires_at, locale)}</p>
        </div>
        <div className="card">
          <p className="label">{locale === "pt" ? "Moedas compradas" : "Purchased coins"}</p>
          <p className="text-3xl font-extrabold">{formatNumber(wallet.purchased_coins, locale)}</p>
          <p className="mt-1 text-xs text-muted">{locale === "pt" ? "Nunca expiram" : "Never expire"}</p>
        </div>
        <div className="card">
          <p className="label">{t("dash.usedMonth")}</p>
          <p className="text-3xl font-extrabold">{formatNumber(used, locale)}</p>
          <p className="mt-1 text-xs text-muted">{locale === "pt" ? "Recebidas este mês" : "Received this month"}: {formatNumber(received, locale)}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-bold">{t("packs.title")}</h2>
        <CoinPackages packages={packages} signedIn />
      </section>

      <section>
        <h2 className="mb-3 font-bold">{locale === "pt" ? "Custos das ferramentas" : "Tool costs"}</h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase text-muted">
              <tr><th className="px-4 py-2">{locale === "pt" ? "Ferramenta" : "Tool"}</th><th className="px-4 py-2 text-right">{t("tool.cost")}</th><th className="px-4 py-2 text-right">{locale === "pt" ? "Com o seu saldo" : "With your balance"}</th><th className="hidden px-4 py-2 text-right sm:table-cell">{locale === "pt" ? "Usadas este mês" : "Used this month"}</th></tr>
            </thead>
            <tbody>
              {costs.map((c) => {
                const meta = TOOL_BY_ID[c.tool];
                if (!meta) return null;
                return (
                  <tr key={c.tool} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{pick(meta.label, locale)}</td>
                    <td className="px-4 py-2.5 text-right">{c.enabled ? c.coins : <span className="badge-soon">{t("price.soon")}</span>}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{c.enabled && c.coins > 0 ? `≈ ${Math.floor(wallet.total / c.coins)}` : "—"}</td>
                    <td className="hidden px-4 py-2.5 text-right text-muted sm:table-cell">{byTool.get(c.tool) ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">{locale === "pt" ? "Histórico de operações" : "Transaction history"}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase text-muted">
              <tr><th className="px-4 py-2">{locale === "pt" ? "Data" : "Date"}</th><th className="px-4 py-2">{locale === "pt" ? "Operação" : "Operation"}</th><th className="px-4 py-2 text-right">{locale === "pt" ? "Moedas" : "Coins"}</th><th className="px-4 py-2 text-right">{t("tool.balance")}</th></tr>
            </thead>
            <tbody>
              {((ledger.data ?? []) as LedgerRow[]).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(r.created_at, locale)}</td>
                  <td className="px-4 py-2">{reasonLabel(r.reason, locale)}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${r.delta < 0 ? "text-danger" : "text-ok"}`}>{r.delta > 0 ? "+" : ""}{r.delta}</td>
                  <td className="px-4 py-2 text-right text-muted">{r.balance_after}</td>
                </tr>
              ))}
              {!ledger.data?.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">{t("dash.none")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
