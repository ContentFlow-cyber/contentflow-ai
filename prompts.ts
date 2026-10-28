import { LANGUAGES, PLATFORM_LABELS } from "./tool-meta";
import type { GenerateInput } from "./schema";
import { GOAL_PROMPT, type Strategy } from "./strategy";

export interface BuiltPrompt {
  system: string;
  prompt: string;
  maxTokens: number;
}

function langName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? "English";
}

const LENGTH_HINT: Record<string, Record<string, string>> = {
  caption: { short: "1-2 short sentences", medium: "3-5 sentences", long: "a longer storytelling caption (6-10 sentences)" },
  script: { short: "15-30 seconds", medium: "30-60 seconds", long: "60-90 seconds" },
  ad: { short: "under 40 words", medium: "40-90 words", long: "90-150 words" },
  email: { short: "under 90 words", medium: "120-180 words", long: "220-320 words" },
  product: { short: "under 60 words", medium: "80-140 words", long: "150-250 words" },
  seo: { short: "a brief outline", medium: "a full outline with section summaries", long: "a full outline plus a 150-word introduction" },
  repurpose: { short: "concise", medium: "medium length", long: "detailed" },
  blog: { short: "about 500 words", medium: "about 900 words", long: "about 1500 words" },
};

const BASE_SYSTEM = `You are ContentFlow AI, an expert social media and marketing copywriter.
Rules:
- Write ONLY in the requested output language.
- Produce ready-to-use content. Do not add preambles, explanations of what you did, or closing remarks.
- Never invent statistics, testimonials, awards, prices, customers or results. If a fact is needed and was not provided, keep the wording general.
- Never promise reach, virality or guaranteed sales.
- Be specific to the user's business, audience and objective. Avoid generic advice that could apply to anyone.
- Use plain text with simple labels. Do not use markdown tables.`;

function strategyLines(s: Strategy | null): string[] {
  if (!s) return [];
  return [
    s.goal ? `The user's main objective: ${GOAL_PROMPT[s.goal]}` : "",
    s.business_type ? `Business / content type: ${s.business_type}` : "",
    s.audience && !s.audience.includes("\n") ? `Usual audience: ${s.audience}` : "",
  ].filter(Boolean);
}

export function buildPrompt(tool: string, i: GenerateInput, brandVoice: string, strategy: Strategy | null = null): BuiltPrompt {
  const lang = langName(i.language);
  const platform = PLATFORM_LABELS[i.platform];
  const ctx: string[] = [
    `Output language: ${lang}`,
    `Tone of voice: ${i.tone}`,
    i.audience ? `Target audience: ${i.audience}` : "",
    `Goal: ${i.goal}`,
    i.platform !== "all" ? `Platform: ${platform}` : "",
    brandVoice ? `Brand voice to follow: ${brandVoice}` : "",
    ...(tool === "image" ? [] : strategyLines(strategy)),
  ].filter(Boolean);
  const context = ctx.join("\n");
  const len = LENGTH_HINT[tool]?.[i.length] ?? "";
  const emoji = i.emojis ? "Use emojis sparingly where natural." : "Do not use emojis.";
  const tags = i.hashtags ? "Finish with 5-10 relevant hashtags." : "Do not include hashtags.";

  switch (tool) {
    case "caption":
      return {
        system: BASE_SYSTEM,
        maxTokens: 900,
        prompt: `${context}\nLength: ${len}\n${emoji} ${tags}\nTopic: ${i.topic}\n\nWrite one social media post with exactly these labelled parts:\nTITLE: (a short headline)\nCAPTION: (the full caption, starting with a strong hook)\nCTA: (one clear call to action)\n${i.hashtags ? "HASHTAGS: (space-separated)\n" : ""}WHY: (one sentence explaining why this fits the user's objective and audience)`,
      };
    case "hashtags":
      return {
        system: BASE_SYSTEM,
        maxTokens: 700,
        prompt: `${context}\nTopic: ${i.topic}\n\nGenerate 25-30 relevant hashtags grouped into categories (e.g. Broad, Niche, Community, Trending-style, Branded ideas). One line per category in the form "Category: #tag #tag ...". Mix reach levels. Do not claim any hashtag will bring a specific reach.`,
      };
    case "ideas":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1500,
        prompt: `${context}\nNiche/business: ${i.topic}\n\nGive 10 distinct post ideas. For each, use exactly:\n1. TITLE: ...\n   DESCRIPTION: (one or two sentences)\n   FORMAT: (e.g. Reel, Carousel, Single image, Story, Live, Article)\n   WHY: (why this idea fits the user's objective)\n   AUDIENCE: (who it is for)`,
      };
    case "script":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1600,
        prompt: `${context}\nVideo length: ${len}\nTopic: ${i.topic}\n\nWrite a short-form video script with:\nHOOK: (first 3 seconds)\nthen numbered SCENES, each with:\n  SCENE n (time range)\n  VOICEOVER: ...\n  VISUAL: (what is on screen)\nthen:\nCTA: ...\nCAPTION: (optional short caption${i.hashtags ? " with hashtags" : ""})\nWHY: (one sentence on why this script suits the user's objective and audience)`,
      };
    case "titles":
      return {
        system: BASE_SYSTEM,
        maxTokens: 800,
        prompt: `${context}\nTopic: ${i.topic}\n\nWrite 8 headline options and 8 call-to-action options. Format:\nTITLES:\n1. ...\nCTAS:\n1. ...\nWHY: (one sentence on why these options suit the user's objective and audience)`,
      };
    case "ad":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1200,
        prompt: `${context}\nLength per variation: ${len}\n${emoji}\nProduct/offer: ${i.topic}\n${i.extra ? `Key benefits: ${i.extra}\n` : ""}\nWrite 3 ad copy variations. For each: HEADLINE, BODY, CTA. Only use claims present in the information above.`,
      };
    case "email":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1200,
        prompt: `${context}\nLength: ${len}\nPurpose: ${i.topic}\n${i.extra ? `Context: ${i.extra}\n` : ""}\nWrite one professional email with:\nSUBJECT: ...\nBODY: (greeting, message, sign-off with a [Your name] placeholder)`,
      };
    case "product":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1000,
        prompt: `${context}\nLength: ${len}\nProduct: ${i.topic}\n${i.extra ? `Features/details: ${i.extra}\n` : ""}\nWrite a product description with: TITLE, DESCRIPTION, and 4-6 BENEFIT BULLETS. Use only the facts provided.`,
      };
    case "seo":
      return {
        system: BASE_SYSTEM,
        maxTokens: 1800,
        prompt: `${context}\nDepth: ${len}\nMain keyword/topic: ${i.topic}\n${i.extra ? `Notes: ${i.extra}\n` : ""}\nProduce:\nMETA TITLE: (max 60 characters)\nMETA DESCRIPTION: (max 155 characters)\nPRIMARY & SECONDARY KEYWORDS: ...\nOUTLINE: (H1, H2s, H3s)\nContent as described by the depth setting. Do not promise rankings.`,
      };
    case "repurpose":
      return {
        system: BASE_SYSTEM,
        maxTokens: 2000,
        prompt: `${context}\nLength: ${len}\nTarget format: ${i.topic || "the format best suited to the platform"}\n\nRewrite the ORIGINAL CONTENT below for the target format. Keep the facts accurate and do not add new claims.\n\nORIGINAL CONTENT:\n"""\n${i.extra}\n"""`,
      };
    case "blog":
      return {
        system: BASE_SYSTEM,
        maxTokens: i.length === "long" ? 3500 : i.length === "medium" ? 2400 : 1500,
        prompt: `${context}\nLength: ${len}\nTopic: ${i.topic}\n${i.extra ? `Keywords to include naturally: ${i.extra}\n` : ""}\nWrite a structured blog article with a TITLE, an introduction, clear sections with subheadings, and a conclusion. Do not invent statistics or sources.`,
      };
    case "calendar": {
      const start = i.startDate ?? "the first day";
      return {
        system: `${BASE_SYSTEM}\nYou output ONLY valid JSON, with no markdown fences and no commentary.`,
        maxTokens: i.days === 30 ? 7000 : 2800,
        prompt: `${context}\nNiche/business: ${i.topic}\n${i.extra ? `Themes/campaigns: ${i.extra}\n` : ""}Plan length: ${i.days} days (starting ${start}). Create exactly ${i.days} entries, one per day, numbered day 1 to ${i.days}.\n${i.platform === "all" ? "Vary the platform across Instagram, TikTok, Facebook, LinkedIn and YouTube as fits the niche." : `Use the platform "${platform}" for every entry.`}\nKeep "topic" short (max 12 words), "format" a content format (Reel, Carousel, Story, Post, Video...), and "idea" a 1-2 sentence concrete idea written in ${lang}.\n\nReturn exactly this JSON shape:\n{"entries":[{"day":1,"platform":"Instagram","topic":"...","format":"...","idea":"..."}]}`,
      };
    }
    case "image": {
      const style = i.extra ? ` Style: ${i.extra}.` : "";
      return { system: "", maxTokens: 0, prompt: `${i.topic}.${style}`.slice(0, 3800) };
    }
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

/**
 * Next-week test plan. The model only receives findings that were computed from the user's own
 * data by lib/insights.ts, and is told not to add numbers of its own.
 */
export function buildInsightsPrompt(
  analysisText: string,
  focus: string,
  language: string,
  strategy: Strategy | null,
): BuiltPrompt {
  const lang = langName(language);
  return {
    system: `${BASE_SYSTEM}\nYou only use the numbers given in the DATA block. You do not invent metrics, benchmarks or predictions, and you never claim that something will work.`,
    maxTokens: 1500,
    prompt: `Output language: ${lang}\n${strategyLines(strategy).join("\n")}\n${focus ? `User focus: ${focus}\n` : ""}\nDATA (computed from the user's own posts):\n${analysisText}\n\nWrite a plan of 3 small experiments for NEXT WEEK. For each experiment use exactly:\n1. EXPERIMENT: (what to publish)\n   BASED ON: (which observation from DATA supports it, quoting its numbers)\n   HOW TO MEASURE: (which metric to compare and against what)\n   IDEA: (one concrete first post idea)\nFinish with:\nLIMITS: (one sentence reminding that this is based on a small amount of the user's own data and is not a prediction)`,
  };
}

/** Short title for the history list. */
export function titleFor(tool: string, i: GenerateInput, text: string): string {
  const base = (i.topic || i.extra || text).replace(/\s+/g, " ").trim();
  return base.length > 80 ? `${base.slice(0, 77)}…` : base;
}
