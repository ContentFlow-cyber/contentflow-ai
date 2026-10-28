import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError, readJson } from "@/lib/api";
import { generateSchema, calendarOutputSchema } from "@/lib/schema";
import { TOOL_BY_ID } from "@/lib/tool-meta";
import { buildInsightsPrompt, buildPrompt, titleFor, type BuiltPrompt } from "@/lib/prompts";
import { analyze, type PostRow } from "@/lib/insights";
import type { Strategy } from "@/lib/strategy";
import {
  NotConfiguredError,
  generateImage,
  generateText,
  isImageAiConfigured,
  isTextAiConfigured,
} from "@/lib/ai";
import { getPlan, getWallet } from "@/lib/wallet";
import { PLAN_RANK, type PlanId, type Wallet } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  const meta = TOOL_BY_ID[tool];
  if (!meta) return jsonError("Unknown tool.", 404);

  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);

  const parsed = generateSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  }
  const input = parsed.data;
  if (meta.requiredTopic && input.topic.length < 3) return jsonError("Please describe the topic (at least 3 characters).", 400);
  if (meta.requiredExtra && input.extra.length < 20) return jsonError("Please paste the original content (at least 20 characters).", 400);

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return jsonError("The server is not configured yet (SUPABASE_SERVICE_ROLE_KEY).", 503, { code: "not_configured", missing: "SUPABASE_SERVICE_ROLE_KEY" });
  }

  // 1. Cost + availability (always read from the database, never from the browser).
  const { data: cost } = await admin.from("tool_costs").select("*").eq("tool", tool).maybeSingle();
  if (!cost || !cost.enabled || meta.kind === "video") {
    return jsonError("This tool is not available yet.", 501, { code: "pending" });
  }

  // 2. Integration configured? Checked BEFORE charging anything.
  if (meta.kind === "image" ? !isImageAiConfigured() : !isTextAiConfigured()) {
    const missing = meta.kind === "image" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    return jsonError(`This feature is not configured yet. The site owner must set ${missing}.`, 503, { code: "not_configured", missing });
  }

  // 3. Plan access.
  let wallet: Wallet;
  try {
    wallet = await getWallet(user.id, admin);
  } catch (e) {
    await logError("wallet", String(e), { tool }, user.id);
    return jsonError("Could not read your wallet.", 500);
  }
  const planId = wallet.plan_id as PlanId;
  if (PLAN_RANK[planId] < PLAN_RANK[cost.min_plan as PlanId]) {
    return jsonError(`This tool needs the ${cost.min_plan} plan or higher.`, 403, { code: "plan_required", required: cost.min_plan });
  }
  const plan = await getPlan(admin, planId);

  // 4. Brand voice (paid plans only). Ownership is verified with an explicit user_id filter.
  let brandVoice = "";
  let brandId: string | null = null;
  if (plan?.can_brand_voice) {
    if (input.brand_id) {
      const { data: brand } = await admin.from("brands").select("id,voice").eq("id", input.brand_id).eq("user_id", user.id).maybeSingle();
      if (!brand) return jsonError("Brand not found.", 404);
      brandVoice = brand.voice;
      brandId = brand.id;
    } else {
      const { data: prefs } = await admin.from("preferences").select("brand_voice").eq("user_id", user.id).maybeSingle();
      brandVoice = prefs?.brand_voice ?? "";
    }
  }

  // 4b. The user's objective and business context personalise every text tool.
  const { data: strat } = await admin
    .from("strategy_profiles")
    .select("goal,business_type,audience,platform")
    .eq("user_id", user.id)
    .maybeSingle();
  const strategy = (strat as Strategy | null) ?? null;

  // 4c. The test plan is built from the user's own results. Checked BEFORE charging anything.
  let insightsPrompt: BuiltPrompt | null = null;
  if (tool === "insights") {
    const { data: rows } = await admin
      .from("posts")
      .select("id,platform,title,format,topic,objective,published_at,source,views,likes,comments,shares,saves,reach")
      .eq("user_id", user.id)
      .order("published_at", { ascending: false })
      .limit(500);
    const analysis = analyze((rows ?? []) as PostRow[]);
    if (!analysis.enough) {
      return jsonError(analysis.limitation.en, 422, { code: "not_enough_data" });
    }
    const data = JSON.stringify({
      limitation: analysis.limitation.en,
      summary: { ...analysis.summary, topPosts: analysis.summary.topPosts.map((p) => ({ title: p.title, platform: p.platform, views: p.views })) },
      findings: analysis.findings.map((f) => ({ observation: f.text.en, evidence: f.evidence.map((e) => e.en), confidence: f.confidence })),
    });
    insightsPrompt = buildInsightsPrompt(data, input.extra, input.language, strategy);
  }

  // 5. Reserve (deduct) coins atomically. Refunded below if anything fails.
  const key = randomUUID();
  const { data: spend, error: spendErr } = await admin.rpc("spend_coins", {
    p_user: user.id,
    p_cost: cost.coins,
    p_key: key,
    p_tool: tool,
  });
  if (spendErr) {
    await logError("spend_coins", spendErr.message, { tool }, user.id);
    return jsonError("Could not process coins. You were not charged.", 500);
  }
  if (!spend?.ok) {
    return jsonError("Not enough coins for this creation.", 402, {
      code: "insufficient_coins",
      balance: spend?.balance ?? 0,
      cost: cost.coins,
    });
  }

  const refund = async () => {
    const { error } = await admin.rpc("refund_coins", { p_user: user.id, p_key: key });
    if (error) await logError("refund_coins", error.message, { key, tool }, user.id);
  };

  // 6. Generate.
  try {
    const built = insightsPrompt ?? buildPrompt(tool, input, brandVoice, strategy);
    let text = "";
    let output: Record<string, unknown> = {};
    let imageUrl: string | null = null;

    if (meta.kind === "image") {
      const bytes = await generateImage(built.prompt, input.imageSize);
      const path = `${user.id}/${randomUUID()}.png`;
      const up = await admin.storage.from("generated-images").upload(path, bytes, { contentType: "image/png" });
      if (up.error) throw new Error(`Storage upload failed: ${up.error.message}`);
      text = built.prompt;
      output = { image_path: path };
      const signed = await admin.storage.from("generated-images").createSignedUrl(path, 3600);
      imageUrl = signed.data?.signedUrl ?? null;
    } else {
      text = await generateText(built);
      if (meta.kind === "calendar") {
        const start = input.startDate ? new Date(`${input.startDate}T00:00:00Z`) : new Date(Date.now() + 86_400_000);
        const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        const cal = calendarOutputSchema.parse(JSON.parse(json));
        const entries = cal.entries.map((e) => {
          const d = new Date(start.getTime() + (e.day - 1) * 86_400_000);
          return { ...e, date: d.toISOString().slice(0, 10) };
        });
        output = { entries };
        text = entries.map((e) => `${e.date} · ${e.platform} · ${e.format}\n${e.topic}\n${e.idea}`).join("\n\n");
      }
    }

    const { data: gen, error: insErr } = await admin
      .from("generations")
      .insert({
        user_id: user.id,
        tool,
        brand_id: brandId,
        title: titleFor(tool, input, text),
        input,
        output,
        text,
        coins_spent: cost.coins,
      })
      .select("*")
      .single();
    if (insErr || !gen) throw new Error(`Saving the result failed: ${insErr?.message}`);

    // History limit (favorites are kept).
    if (plan && plan.history_limit > 0) {
      const { data: old } = await admin
        .from("generations")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_favorite", false)
        .order("created_at", { ascending: false })
        .range(plan.history_limit, plan.history_limit + 500);
      if (old && old.length) {
        await admin.from("generations").delete().eq("user_id", user.id).in("id", old.map((o: { id: string }) => o.id));
      }
    }

    const fresh = await getWallet(user.id, admin);
    return NextResponse.json({ generation: gen, image_url: imageUrl, wallet: fresh, cost: cost.coins });
  } catch (e) {
    await refund();
    await logError("generate", e instanceof Error ? e.message : String(e), { tool }, user.id);
    if (e instanceof NotConfiguredError) {
      return jsonError(`This feature is not configured yet. The site owner must set ${e.missing}. You were not charged.`, 503, { code: "not_configured", missing: e.missing });
    }
    return jsonError("The AI service could not complete this request. Your coins were returned. Please try again.", 502, { code: "generation_failed" });
  }
}
