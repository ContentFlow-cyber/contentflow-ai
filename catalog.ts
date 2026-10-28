import { createClient } from "@/lib/supabase/server";
import type { CoinPackage, Plan, ToolCost } from "./types";

// Fallback shown only when the database is not reachable/configured yet (e.g. first local run).
// The database (editable in the Admin panel) is the source of truth.
const DEFAULT_PLANS: Plan[] = [
  {
    id: "free", name: "Free", monthly_coins: 100, price_eur_month: 0, price_usd_month: 0, price_eur_year: 0, price_usd_year: 0,
    history_limit: 20, max_brands: 0, can_favorite: false, can_export: false, can_calendar: false, can_brand_voice: false, sort: 0,
    features: [
      { en: "100 coins per month", pt: "100 moedas por mês", status: "live" },
      { en: "Captions, hashtags, ideas, titles and video scripts", pt: "Legendas, hashtags, ideias, títulos e guiões de vídeo", status: "live" },
      { en: "History of your last 20 creations", pt: "Histórico das últimas 20 criações", status: "live" },
    ],
  },
  {
    id: "pro", name: "Pro", monthly_coins: 2000, price_eur_month: 1799, price_usd_month: 1900, price_eur_year: 17990, price_usd_year: 19000,
    history_limit: 0, max_brands: 1, can_favorite: true, can_export: true, can_calendar: true, can_brand_voice: true, sort: 1,
    features: [
      { en: "2,000 coins per month", pt: "2.000 moedas por mês", status: "live" },
      { en: "All content tools: articles, ads, emails, SEO, calendars", pt: "Todas as ferramentas: artigos, anúncios, emails, SEO, calendários", status: "live" },
      { en: "AI image generation (coin cost applies)", pt: "Geração de imagens com IA (custo em moedas)", status: "live" },
      { en: "Full history, favorites and export", pt: "Histórico completo, favoritos e exportação", status: "live" },
      { en: "Custom brand voice and content calendar", pt: "Voz da marca personalizada e calendário", status: "live" },
      { en: "Priority processing", pt: "Processamento prioritário", status: "soon" },
    ],
  },
  {
    id: "business", name: "Business", monthly_coins: 5000, price_eur_month: 3599, price_usd_month: 3900, price_eur_year: 35990, price_usd_year: 39000,
    history_limit: 0, max_brands: 10, can_favorite: true, can_export: true, can_calendar: true, can_brand_voice: true, sort: 2,
    features: [
      { en: "5,000 coins per month", pt: "5.000 moedas por mês", status: "live" },
      { en: "Everything in Pro", pt: "Tudo o que existe no Pro", status: "live" },
      { en: "Multiple brands and projects", pt: "Várias marcas e projetos", status: "live" },
      { en: "Usage statistics", pt: "Estatísticas de utilização", status: "live" },
      { en: "Team seats (up to 3 users)", pt: "Equipa (até 3 utilizadores)", status: "soon" },
      { en: "Batch creation and collaboration tools", pt: "Criação em lote e colaboração", status: "soon" },
      { en: "Priority support", pt: "Suporte prioritário", status: "soon" },
    ],
  },
];

const DEFAULT_COSTS: ToolCost[] = [
  ["caption", 2, "free"], ["hashtags", 1, "free"], ["ideas", 2, "free"], ["script", 5, "free"], ["titles", 1, "free"],
  ["ad", 3, "pro"], ["email", 3, "pro"], ["product", 2, "pro"], ["seo", 4, "pro"], ["repurpose", 4, "pro"],
  ["blog", 8, "pro"], ["calendar", 15, "pro"], ["image", 10, "pro"], ["video", 50, "pro"], ["insights", 3, "free"],
].map(([tool, coins, min], i) => ({
  tool: tool as string, coins: coins as number, enabled: tool !== "video", min_plan: min as ToolCost["min_plan"], sort: i,
}));

const DEFAULT_PACKAGES: CoinPackage[] = [
  { id: "default-1", name: "Starter", coins: 500, price_eur: 499, price_usd: 549, is_active: true, sort: 1 },
  { id: "default-2", name: "Creator", coins: 1500, price_eur: 1299, price_usd: 1399, is_active: true, sort: 2 },
  { id: "default-3", name: "Studio", coins: 4000, price_eur: 2999, price_usd: 3299, is_active: true, sort: 3 },
];

export interface Catalog {
  plans: Plan[];
  costs: ToolCost[];
  packages: CoinPackage[];
  fromDatabase: boolean;
}

export async function loadCatalog(): Promise<Catalog> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { plans: DEFAULT_PLANS, costs: DEFAULT_COSTS, packages: DEFAULT_PACKAGES, fromDatabase: false };
  }
  try {
    const supabase = await createClient();
    const [p, c, k] = await Promise.all([
      supabase.from("plans").select("*").order("sort"),
      supabase.from("tool_costs").select("*").order("sort"),
      supabase.from("coin_packages").select("*").eq("is_active", true).order("sort"),
    ]);
    if (p.error || c.error || k.error || !p.data?.length) throw new Error("catalog unavailable");
    return {
      plans: p.data as Plan[],
      costs: c.data as ToolCost[],
      packages: (k.data ?? []) as CoinPackage[],
      fromDatabase: true,
    };
  } catch {
    return { plans: DEFAULT_PLANS, costs: DEFAULT_COSTS, packages: DEFAULT_PACKAGES, fromDatabase: false };
  }
}
