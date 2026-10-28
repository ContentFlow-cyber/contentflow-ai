// Client-safe strategy constants.
export const STRATEGY_GOALS = ["views", "followers", "engagement", "leads", "sales", "promote"] as const;
export type StrategyGoal = (typeof STRATEGY_GOALS)[number];

export const GOAL_LABELS: Record<StrategyGoal, { en: string; pt: string }> = {
  views: { en: "Get more views", pt: "Conseguir mais visualizações" },
  followers: { en: "Grow my followers", pt: "Aumentar o número de seguidores" },
  engagement: { en: "Get more interaction and comments", pt: "Conseguir mais interação e comentários" },
  leads: { en: "Attract potential customers", pt: "Atrair potenciais clientes" },
  sales: { en: "Increase sales", pt: "Aumentar as vendas" },
  promote: { en: "Promote a business, service or product", pt: "Divulgar um negócio, serviço ou produto" },
};

/** Phrase used inside AI prompts (always English; the output language is set separately). */
export const GOAL_PROMPT: Record<StrategyGoal, string> = {
  views: "get more views",
  followers: "grow the number of followers",
  engagement: "get more interaction and comments",
  leads: "attract potential customers (leads)",
  sales: "increase sales",
  promote: "promote a business, service or product",
};

/** Maps the user's objective to the tool-level goal used by the generators. */
export const GOAL_TO_TOOL_GOAL: Record<StrategyGoal, "engagement" | "education" | "awareness" | "sales"> = {
  views: "awareness",
  followers: "engagement",
  engagement: "engagement",
  leads: "sales",
  sales: "sales",
  promote: "awareness",
};

export interface Strategy {
  goal: StrategyGoal | null;
  business_type: string;
  audience: string;
  platform: string | null;
}
