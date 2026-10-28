import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlan, getWallet } from "@/lib/wallet";
import { isImageAiConfigured, isTextAiConfigured } from "@/lib/ai";
import { TOOL_BY_ID, pick } from "@/lib/tool-meta";
import { PLAN_RANK, type Brand, type PlanId } from "@/lib/types";
import { GOAL_TO_TOOL_GOAL, type StrategyGoal } from "@/lib/strategy";
import { ToolRunner } from "@/components/dashboard/ToolRunner";

export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string }>;
  searchParams: Promise<{ topic?: string }>;
}) {
  const { tool } = await params;
  const { topic: topicParam } = await searchParams;
  const meta = TOOL_BY_ID[tool];
  if (!meta) notFound();

  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [wallet, costRes, prefs, brands, strat] = await Promise.all([
    getWallet(user!.id, admin),
    admin.from("tool_costs").select("*").eq("tool", tool).maybeSingle(),
    supabase.from("preferences").select("default_platform,default_tone,default_language").maybeSingle(),
    supabase.from("brands").select("id,name,voice,created_at").order("created_at"),
    supabase.from("strategy_profiles").select("goal,audience,platform").maybeSingle(),
  ]);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  const stratGoal = strat.data?.goal as StrategyGoal | undefined;
  const cost = costRes.data;

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{pick(meta.label, locale)}</h1>
      <p className="mt-1 text-sm text-muted">{pick(meta.desc, locale)}</p>
    </div>
  );

  if (meta.kind === "video" || !cost || !cost.enabled) {
    return (
      <div>
        {header}
        <div className="card border-warn/40 bg-warn/10 text-sm">
          <p className="font-semibold">{t("tool.pending")}</p>
          <p className="mt-1 text-muted">
            {meta.kind === "video"
              ? "Text-to-video needs a video generation provider to be integrated and configured. No coins are charged and no placeholder output is shown. Use the Video Script tool to prepare scripts in the meantime."
              : "This tool has been switched off by the site administrator."}
          </p>
          <Link href="/dashboard/tools/script" className="btn-secondary mt-4">{pick(TOOL_BY_ID.script.label, locale)}</Link>
        </div>
      </div>
    );
  }

  const needsPlan = PLAN_RANK[wallet.plan_id as PlanId] < PLAN_RANK[cost.min_plan as PlanId];
  const configured = meta.kind === "image" ? isImageAiConfigured() : isTextAiConfigured();

  return (
    <div className="animate-fade-up">
      {header}
      {needsPlan && (
        <div className="card mb-6 border-brand/40 bg-brand/5 text-sm">
          {t("tool.needPlan", { plan: cost.min_plan })}{" "}
          <Link href="/dashboard/billing" className="font-semibold text-brand underline">{t("common.upgrade")}</Link>
        </div>
      )}
      {!configured && (
        <div className="card mb-6 border-warn/40 bg-warn/10 text-sm">
          {t("tool.notConfigured")} ({meta.kind === "image" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"})
        </div>
      )}
      <ToolRunner
        meta={meta}
        cost={cost.coins}
        balance={wallet.total}
        brands={(brands.data ?? []) as Brand[]}
        defaults={{ platform: prefs.data?.default_platform, tone: prefs.data?.default_tone, language: prefs.data?.default_language }}
        initial={{
          topic: topicParam ? topicParam.slice(0, 200) : undefined,
          audience: strat.data?.audience || undefined,
          platform: strat.data?.platform,
          goal: stratGoal ? GOAL_TO_TOOL_GOAL[stratGoal] : undefined,
        }}
        perms={{
          favorite: Boolean(plan?.can_favorite),
          export: Boolean(plan?.can_export),
          calendar: Boolean(plan?.can_calendar),
          brandVoice: Boolean(plan?.can_brand_voice),
        }}
      />
    </div>
  );
}
