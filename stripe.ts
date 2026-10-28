import Stripe from "stripe";

export class StripeNotConfiguredError extends Error {
  constructor(public missing: string) {
    super(`${missing} is not configured.`);
  }
}

let cached: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError("STRIPE_SECRET_KEY");
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
