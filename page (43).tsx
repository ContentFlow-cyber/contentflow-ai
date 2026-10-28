import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlan, getWallet } from "@/lib/wallet";
import { SavedList } from "@/components/dashboard/SavedList";
import type { Generation, PlanId } from "@/lib/types";

export const metadata: Metadata = { title: "Saved & History" };

export default async function SavedPage() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const wallet = await getWallet(user!.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);

  // RLS ensures only this user's rows are returned.
  const { data } = await supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as (Generation & { image_url?: string | null })[];

  // Signed URLs for images (paths come from the user's own rows only).
  await Promise.all(
    rows.map(async (r) => {
      const path = (r.output as { image_path?: string } | null)?.image_path;
      if (path && path.startsWith(`${user!.id}/`)) {
        const s = await admin.storage.from("generated-images").createSignedUrl(path, 3600);
        r.image_url = s.data?.signedUrl ?? null;
      }
    }),
  );

  return (
    <div className="animate-fade-up">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">{t("side.saved")}</h1>
      {plan && plan.history_limit > 0 && (
        <p className="mb-4 text-sm text-muted">
          {locale === "pt"
            ? `O plano ${plan.name} guarda as últimas ${plan.history_limit} criações. `
            : `The ${plan.name} plan keeps your last ${plan.history_limit} creations. `}
          <Link href="/dashboard/billing" className="font-semibold text-brand underline">{t("common.upgrade")}</Link>
        </p>
      )}
      <SavedList initial={rows} canFavorite={Boolean(plan?.can_favorite)} canExport={Boolean(plan?.can_export)} />
    </div>
  );
}
