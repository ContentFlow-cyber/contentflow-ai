export type PlanId = "free" | "pro" | "business";
export type Currency = "eur" | "usd";
export type Interval = "month" | "year";

export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, business: 2 };

export interface PlanFeature {
  en: string;
  pt: string;
  status: "live" | "soon";
}

export interface Plan {
  id: PlanId;
  name: string;
  monthly_coins: number;
  price_eur_month: number;
  price_usd_month: number;
  price_eur_year: number;
  price_usd_year: number;
  history_limit: number;
  max_brands: number;
  can_favorite: boolean;
  can_export: boolean;
  can_calendar: boolean;
  can_brand_voice: boolean;
  features: PlanFeature[];
  sort: number;
}

export interface ToolCost {
  tool: string;
  coins: number;
  enabled: boolean;
  min_plan: PlanId;
  sort: number;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_eur: number;
  price_usd: number;
  is_active: boolean;
  sort: number;
}

export interface Wallet {
  plan_id: PlanId;
  plan_coins: number;
  purchased_coins: number;
  total: number;
  expires_at: string | null;
}

export interface Generation {
  id: string;
  tool: string;
  brand_id: string | null;
  title: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  text: string;
  is_favorite: boolean;
  coins_spent: number;
  created_at: string;
}

export interface CalendarEntry {
  id: string;
  brand_id: string | null;
  date: string;
  platform: string;
  topic: string;
  format: string;
  idea: string;
  status: "planned" | "draft" | "published";
}

export interface Brand {
  id: string;
  name: string;
  voice: string;
  created_at: string;
}

export interface LedgerRow {
  id: string;
  delta: number;
  bucket: string;
  reason: string;
  balance_after: number;
  created_at: string;
}

export interface SubscriptionRow {
  plan: PlanId;
  status: string;
  interval: Interval;
  currency: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}
