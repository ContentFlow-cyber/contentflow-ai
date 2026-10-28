// Deterministic performance analysis. No runtime imports on purpose so it can be unit-tested
// with plain Node. Every number shown to a user comes from their own posts: nothing is invented,
// and nothing is "predicted". This is rule-based analysis, not a trained model.

export interface PostRow {
  id: string;
  platform: string;
  title: string;
  format: string;
  topic: string;
  objective: string | null;
  published_at: string;
  source: "manual" | "synced";
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
}

export interface Bi {
  en: string;
  pt: string;
}

export interface Finding {
  id: string;
  kind: "format_views" | "topic_comments" | "views_low_engagement" | "platform_views" | "top_post";
  confidence: "low" | "medium";
  text: Bi;
  evidence: Bi[];
  action: Bi;
  generate: { tool: string; topic: string };
}

export interface Summary {
  totalPosts: number;
  manualPosts: number;
  syncedPosts: number;
  postsWithViews: number;
  totals: { views: number; likes: number; comments: number; shares: number; saves: number };
  topPosts: PostRow[];
}

export interface Analysis {
  enough: boolean;
  minPosts: number;
  summary: Summary;
  findings: Finding[];
  experiments: Bi[];
  limitation: Bi;
}

export const MIN_POSTS = 5;

const n0 = (v: number | null | undefined): number => (typeof v === "number" ? v : 0);
const round = (v: number): number => Math.round(v);
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function interactions(p: PostRow): number | null {
  const parts = [p.likes, p.comments, p.shares, p.saves];
  if (parts.every((x) => x === null || x === undefined)) return null;
  return parts.reduce<number>((s, x) => s + n0(x), 0);
}

function rate(p: PostRow): number | null {
  const i = interactions(p);
  return i !== null && typeof p.views === "number" && p.views > 0 ? i / p.views : null;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it).trim();
    if (!k) continue;
    const k2 = k.toLowerCase();
    const arr = m.get(k2) ?? [];
    arr.push(it);
    m.set(k2, arr);
  }
  return m;
}

function toolForFormat(format: string): string {
  const f = format.toLowerCase();
  if (/(reel|video|vídeo|short|tiktok|live)/.test(f)) return "script";
  return "caption";
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function summarize(posts: PostRow[]): Summary {
  const withViews = posts.filter((p) => typeof p.views === "number");
  const totals = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  for (const p of posts) {
    totals.views += n0(p.views);
    totals.likes += n0(p.likes);
    totals.comments += n0(p.comments);
    totals.shares += n0(p.shares);
    totals.saves += n0(p.saves);
  }
  return {
    totalPosts: posts.length,
    manualPosts: posts.filter((p) => p.source === "manual").length,
    syncedPosts: posts.filter((p) => p.source === "synced").length,
    postsWithViews: withViews.length,
    totals,
    topPosts: [...withViews].sort((a, b) => n0(b.views) - n0(a.views)).slice(0, 3),
  };
}

const EXPERIMENTS: Bi[] = [
  {
    en: "Publish 3 posts on the same topic in 3 different formats (for example a short video, a carousel and a text post) and log the results of each.",
    pt: "Publique 3 conteúdos sobre o mesmo tema em 3 formatos diferentes (por exemplo um vídeo curto, um carrossel e uma publicação de texto) e registe os resultados de cada um.",
  },
  {
    en: "Try two different opening lines (hooks) on similar posts and compare views and comments.",
    pt: "Experimente duas primeiras frases diferentes em conteúdos semelhantes e compare visualizações e comentários.",
  },
  {
    en: "Add a clear call to action to half of your next posts and compare comments with the other half.",
    pt: "Adicione uma chamada para ação clara a metade das próximas publicações e compare os comentários com a outra metade.",
  },
];

export function analyze(posts: PostRow[]): Analysis {
  const summary = summarize(posts);
  const withViews = posts.filter((p) => typeof p.views === "number") as (PostRow & { views: number })[];
  const enough = withViews.length >= MIN_POSTS;

  const limitation: Bi = enough
    ? {
        en: `Based on ${withViews.length} posts with view counts. These are patterns in your own data, not proof of cause, and not predictions.`,
        pt: `Com base em ${withViews.length} publicações com visualizações. São padrões nos seus próprios dados, não prova de causa nem previsões.`,
      }
    : {
        en: `There is not enough data yet: ${withViews.length} of the ${MIN_POSTS} posts with view counts needed to find reliable patterns. Log or sync more results, and try the experiments below to collect useful data.`,
        pt: `Ainda não há dados suficientes: ${withViews.length} das ${MIN_POSTS} publicações com visualizações necessárias para encontrar padrões fiáveis. Registe ou sincronize mais resultados e experimente as experiências abaixo para recolher dados úteis.`,
      };

  if (!enough) return { enough, minPosts: MIN_POSTS, summary, findings: [], experiments: EXPERIMENTS, limitation };

  const findings: Finding[] = [];

  // 1. Format with clearly more views
  const byFormat = groupBy(withViews, (p) => p.format);
  const fmtGroups = [...byFormat.entries()].filter(([, v]) => v.length >= 2);
  if (fmtGroups.length >= 1) {
    const [name, group] = fmtGroups.sort((a, b) => avg(b[1].map((p) => p.views)) - avg(a[1].map((p) => p.views)))[0];
    const others = withViews.filter((p) => !group.includes(p));
    const gAvg = avg(group.map((p) => p.views));
    const oAvg = avg(others.map((p) => p.views));
    if (others.length >= 2 && oAvg > 0 && gAvg / oAvg >= 1.25) {
      const label = group[0].format.trim();
      const bestPost = [...group].sort((a, b) => b.views - a.views)[0];
      findings.push({
        id: `format_views:${name}`,
        kind: "format_views",
        confidence: Math.min(group.length, others.length) >= 4 ? "medium" : "low",
        text: {
          en: `Your "${label}" posts got more views than your other posts.`,
          pt: `As suas publicações do tipo "${label}" tiveram mais visualizações do que as restantes.`,
        },
        evidence: [
          { en: `"${label}": average ${round(gAvg)} views across ${group.length} posts`, pt: `"${label}": média de ${round(gAvg)} visualizações em ${group.length} publicações` },
          { en: `Other posts: average ${round(oAvg)} views across ${others.length} posts`, pt: `Restantes: média de ${round(oAvg)} visualizações em ${others.length} publicações` },
        ],
        action: {
          en: `Try creating two more "${label}" posts and compare the results with your other formats.`,
          pt: `Experimente criar mais duas publicações do tipo "${label}" e compare os resultados com os outros formatos.`,
        },
        generate: { tool: toolForFormat(label), topic: bestPost.topic || bestPost.title },
      });
    }
  }

  // 2. Topic with clearly more comments
  const withComments = withViews.filter((p) => typeof p.comments === "number") as (PostRow & { comments: number })[];
  const byTopic = groupBy(withComments, (p) => p.topic);
  const topicGroups = [...byTopic.entries()].filter(([, v]) => v.length >= 2);
  if (topicGroups.length >= 1) {
    const [name, group] = topicGroups.sort((a, b) => avg(b[1].map((p) => p.comments)) - avg(a[1].map((p) => p.comments)))[0];
    const others = withComments.filter((p) => !group.includes(p));
    const gAvg = avg(group.map((p) => p.comments));
    const oAvg = avg(others.map((p) => p.comments));
    if (others.length >= 2 && gAvg >= 1 && gAvg >= oAvg * 1.5) {
      const label = group[0].topic.trim();
      findings.push({
        id: `topic_comments:${name}`,
        kind: "topic_comments",
        confidence: Math.min(group.length, others.length) >= 4 ? "medium" : "low",
        text: {
          en: `Posts about "${label}" got more comments than your other posts.`,
          pt: `As publicações sobre "${label}" tiveram mais comentários do que as restantes.`,
        },
        evidence: [
          { en: `"${label}": average ${avg(group.map((p) => p.comments)).toFixed(1)} comments across ${group.length} posts`, pt: `"${label}": média de ${gAvg.toFixed(1)} comentários em ${group.length} publicações` },
          { en: `Other posts: average ${oAvg.toFixed(1)} comments across ${others.length} posts`, pt: `Restantes: média de ${oAvg.toFixed(1)} comentários em ${others.length} publicações` },
        ],
        action: {
          en: "Go deeper on this topic: publish a follow-up and ask your audience a direct question.",
          pt: "Aprofunde este tema: publique um seguimento e faça uma pergunta direta à sua audiência.",
        },
        generate: { tool: "ideas", topic: label },
      });
    }
  }

  // 3. Many views but comparatively few interactions
  const rated = withViews.map((p) => ({ p, r: rate(p) })).filter((x): x is { p: PostRow & { views: number }; r: number } => x.r !== null);
  if (rated.length >= 3) {
    const totalI = rated.reduce((s, x) => s + n0(interactions(x.p)), 0);
    const totalV = rated.reduce((s, x) => s + x.p.views, 0);
    const overall = totalV > 0 ? totalI / totalV : 0;
    const medViews = median(rated.map((x) => x.p.views));
    const flagged = rated
      .filter((x) => x.p.views >= medViews && overall > 0 && x.r < overall * 0.5)
      .sort((a, b) => b.p.views - a.p.views)
      .slice(0, 3);
    if (flagged.length) {
      const first = flagged[0].p;
      findings.push({
        id: `views_low_engagement:${first.id}`,
        kind: "views_low_engagement",
        confidence: rated.length >= 8 ? "medium" : "low",
        text: {
          en: `"${first.title}" got many views but few interactions compared with your other posts.`,
          pt: `"${first.title}" teve muitas visualizações mas poucas interações em comparação com as restantes publicações.`,
        },
        evidence: flagged.map((x) => ({
          en: `"${x.p.title}": ${x.p.views} views, ${n0(interactions(x.p))} interactions (${(x.r * 100).toFixed(1)}% vs ${(overall * 100).toFixed(1)}% overall)`,
          pt: `"${x.p.title}": ${x.p.views} visualizações, ${n0(interactions(x.p))} interações (${(x.r * 100).toFixed(1)}% vs ${(overall * 100).toFixed(1)}% no total)`,
        })),
        action: {
          en: "Try a clearer call to action, for example asking a question or inviting people to comment or save.",
          pt: "Experimente uma chamada para ação mais clara, por exemplo fazer uma pergunta ou convidar a comentar ou guardar.",
        },
        generate: { tool: "titles", topic: first.topic || first.title },
      });
    }
  }

  // 4. Platform with clearly more views
  const byPlatform = groupBy(withViews, (p) => p.platform);
  const platGroups = [...byPlatform.entries()].filter(([, v]) => v.length >= 2);
  if (byPlatform.size >= 2 && platGroups.length >= 1) {
    const [name, group] = platGroups.sort((a, b) => avg(b[1].map((p) => p.views)) - avg(a[1].map((p) => p.views)))[0];
    const others = withViews.filter((p) => !group.includes(p));
    const gAvg = avg(group.map((p) => p.views));
    const oAvg = avg(others.map((p) => p.views));
    if (others.length >= 2 && oAvg > 0 && gAvg / oAvg >= 1.25) {
      findings.push({
        id: `platform_views:${name}`,
        kind: "platform_views",
        confidence: Math.min(group.length, others.length) >= 4 ? "medium" : "low",
        text: {
          en: `Your posts on ${group[0].platform} got more views than on your other platforms.`,
          pt: `As suas publicações em ${group[0].platform} tiveram mais visualizações do que nas outras plataformas.`,
        },
        evidence: [
          { en: `${group[0].platform}: average ${round(gAvg)} views across ${group.length} posts`, pt: `${group[0].platform}: média de ${round(gAvg)} visualizações em ${group.length} publicações` },
          { en: `Other platforms: average ${round(oAvg)} views across ${others.length} posts`, pt: `Outras plataformas: média de ${round(oAvg)} visualizações em ${others.length} publicações` },
        ],
        action: {
          en: `Prioritise ${group[0].platform} for your next posts, but keep testing the other platforms too.`,
          pt: `Dê prioridade a ${group[0].platform} nas próximas publicações, mas continue a testar as outras plataformas.`,
        },
        generate: { tool: "ideas", topic: "" },
      });
    }
  }

  // 5. Best post (a fact, not an inference)
  const top = [...withViews].sort((a, b) => b.views - a.views)[0];
  if (top) {
    findings.push({
      id: `top_post:${top.id}`,
      kind: "top_post",
      confidence: "medium",
      text: {
        en: `Your most viewed post so far is "${top.title}".`,
        pt: `A sua publicação mais vista até agora é "${top.title}".`,
      },
      evidence: [
        { en: `${top.views} views${interactions(top) !== null ? `, ${interactions(top)} interactions` : ""} on ${top.platform} (${top.published_at})`, pt: `${top.views} visualizações${interactions(top) !== null ? `, ${interactions(top)} interações` : ""} em ${top.platform} (${top.published_at})` },
      ],
      action: {
        en: "Reuse what worked: make a follow-up or the same idea from a new angle.",
        pt: "Reaproveite o que funcionou: faça um seguimento ou a mesma ideia com um novo ângulo.",
      },
      generate: { tool: "ideas", topic: top.topic || top.title },
    });
  }

  return { enough, minPosts: MIN_POSTS, summary, findings, experiments: EXPERIMENTS, limitation };
}
