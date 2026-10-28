import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { coinsUsedThisMonth, getPlan, getToolCosts, getWallet } from "@/lib/wallet";
import { TOOL_BY_ID, pick } from "@/lib/tool-meta";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { Generation, PlanId } from "@/lib/types";
import { analyze, type PostRow } from "@/lib/insights";
import type { Strategy } from "@/lib/strategy";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const [wallet, costs, used, profile, recent, favs, strat, posts, conns] = await Promise.all([
    getWallet(user!.id, admin),
    getToolCosts(admin),
    coinsUsedThisMonth(supabase, user!.id),
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("generations").select("id,tool,title,created_at,is_favorite").order("created_at", { ascending: false }).limit(6),
    supabase.from("generations").select("id,tool,title,created_at,is_favorite").eq("is_favorite", true).order("created_at", { ascending: false }).limit(6),
    supabase.from("strategy_profiles").select("goal,business_type,audience,platform").maybeSingle(),
    supabase.from("posts").select("*").order("published_at", { ascending: false }).limit(500),
    admin.from("social_connections").select("provider,status").eq("user_id", user!.id),
  ]);
  const analysis = analyze((posts.data ?? []) as PostRow[]);
  const topFindings = analysis.enough ? analysis.findings.slice(0, 2) : [];
  const pt = locale === "pt";
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  const first = (profile.data?.full_name || "").split(" ")[0];
  const enabled = costs.filter((c) => c.enabled);
  const cheap = (id: string) => costs.find((c) => c.tool === id);
  const examples = ["caption", "script", "blog"]
    .map((id) => ({ id, c: cheap(id) }))
    .filter((x) => x.c && x.c.enabled && x.c.coins > 0);

  const list = (rows: Pick<Generation, "id" | "tool" | "title" | "created_at">[] | null) =>
    rows && rows.length ? (
      <ul className="divide-y divide-border">
        {rows.map((g) => (
          <li key={g.id}>
            <Link href="/dashboard/saved" className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand">
              <span className="truncate">{g.title || "—"}</span>
              <span className="shrink-0 text-xs text-muted">{pick(TOOL_BY_ID[g.tool]?.label ?? { en: g.tool, pt: g.tool }, locale)} · {formatDateTime(g.created_at, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="py-4 text-sm text-muted">{t("dash.none")}</p>
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("dash.hello")}{first ? `, ${first}` : ""} 👋</h1>
      </div>

      <GoalCard initial={(strat.data as Strategy | null) ?? null} />

      <PerformancePanel summary={analysis.summary} locale={locale} />

      <div className="card text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{pt ? "Recomendações" : "Recommendations"}</h2>
          <Link href="/dashboard/insights" className="text-xs text-brand hover:underline">{pt ? "Ver todas" : "See all"}</Link>
        </div>
        {topFindings.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {topFindings.map((f) => (
              <li key={f.id}>{pt ? f.text.pt : f.text.en}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">
            {pt ? `Ainda não há dados suficientes (são precisas pelo menos ${analysis.minPosts} publicações com visualizações). ` : `Not enough data yet (at least ${analysis.minPosts} posts with view counts are needed). `}
            <Link href="/dashboard/results" className="text-brand hover:underline">{pt ? "Registar resultados" : "Log results"}</Link>
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          {pt ? "Ligações: " : "Connections: "}
          {["tiktok", "instagram"].map((p, i) => {
            const c = (conns.data ?? []).find((x: { provider: string }) => x.provider === p) as { status: string } | undefined;
            const st = !c ? (pt ? "não ligada" : "not connected") : c.status === "connected" ? (pt ? "ligada" : "connected") : pt ? "requer atenção" : "needs attention";
            return <span key={p}>{i > 0 && " · "}{p === "tiktok" ? "TikTok" : "Instagram"}: {st}</span>;
          })}{" "}
          <Link href="/dashboard/connections" className="text-brand hover:underline">{pt ? "Gerir" : "Manage"}</Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="label">{t("dash.balance")}</p>
          <p className="text-3xl font-extrabold">{formatNumber(wallet.total, locale)}</p>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(wallet.plan_coins, locale)} plan · {formatNumber(wallet.purchased_coins, locale)} {locale === "pt" ? "compradas" : "purchased"}
          </p>
        </div>
        <div className="card">
          <p className="label">{t("dash.plan")}</p>
          <p className="text-3xl font-extrabold">{plan?.name ?? wallet.plan_id}</p>
          <p className="mt-1 text-xs text-muted">{formatNumber(plan?.monthly_coins ?? 0, locale)} {t("price.coinsPerMonth")}</p>
        </div>
        <div className="card">
          <p className="label">{t("dash.usedMonth")}</p>
          <p className="text-3xl font-extrabold">{formatNumber(used, locale)}</p>
          <p className="mt-1 text-xs text-muted">{t("common.coins")}</p>
        </div>
        <div className="card">
          <p className="label">{t("dash.renews")}</p>
          <p className="text-xl font-extrabold">{formatDate(wallet.expires_at, locale)}</p>
          <p className="mt-1 text-xs text-muted">{locale === "pt" ? "As moedas do plano não utilizadas expiram." : "Unused plan coins expire."}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/coins" className="btn-primary">{t("dash.buy")}</Link>
        <Link href="/dashboard/billing" className="btn-secondary">{t("dash.upgrade")}</Link>
      </div>

      {examples.length > 0 && (
        <p className="text-sm text-muted">
          {t("dash.examples")}{" "}
          {examples.map((x, i) => (
            <span key={x.id}>
              {i > 0 && ", "}
              <strong className="text-text">{Math.floor(wallet.total / x.c!.coins)}</strong> {pick(TOOL_BY_ID[x.id].label, locale).toLowerCase()}
            </span>
          ))}
          .
        </p>
      )}

      <section>
        <h2 className="mb-3 font-bold">{t("dash.quick")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {enabled.slice(0, 8).map((c) => {
            const meta = TOOL_BY_ID[c.tool];
            if (!meta) return null;
            return (
              <Link key={c.tool} href={`/dashboard/tools/${c.tool}`} className="card transition hover:border-brand/50">
                <p className="text-sm font-bold">{pick(meta.label, locale)}</p>
                <p className="mt-1 text-xs text-muted">{c.coins} {t("common.coins")}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-bold">{t("dash.recent")}</h2>
          {list(recent.data as Generation[] | null)}
        </section>
        <section className="card">
          <h2 className="font-bold">{t("dash.favorites")}</h2>
          {plan?.can_favorite ? list(favs.data as Generation[] | null) : (
            <p className="py-4 text-sm text-muted">{locale === "pt" ? "Os favoritos estão disponíveis no plano Pro." : "Favorites are available on the Pro plan."}</p>
          )}
        </section>
      </div>
    </div>
  );
}
