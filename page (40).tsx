import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlan, getWallet } from "@/lib/wallet";
import { BrandsManager } from "@/components/dashboard/BrandsManager";
import type { Brand, PlanId } from "@/lib/types";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const wallet = await getWallet(user!.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  const { data } = await supabase.from("brands").select("id,name,voice,created_at").order("created_at");

  return (
    <div className="animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("side.brands")}</h1>
      {!plan || plan.max_brands < 1 ? (
        <div className="card border-brand/40 bg-brand/5 text-sm">
          {locale === "pt" ? "As marcas e a voz da marca estão disponíveis no plano Pro e superiores." : "Brands and brand voice are available on the Pro plan and above."}{" "}
          <Link href="/dashboard/billing" className="font-semibold text-brand underline">{t("common.upgrade")}</Link>
        </div>
      ) : (
        <BrandsManager initial={(data ?? []) as Brand[]} max={plan.max_brands} />
      )}
    </div>
  );
}
