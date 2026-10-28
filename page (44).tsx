import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlan, getWallet } from "@/lib/wallet";
import { CalendarBoard } from "@/components/dashboard/CalendarBoard";
import type { Brand, CalendarEntry, PlanId } from "@/lib/types";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const wallet = await getWallet(user!.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);

  if (!plan?.can_calendar) {
    return (
      <div className="animate-fade-up">
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("side.calendar")}</h1>
        <div className="card border-brand/40 bg-brand/5 text-sm">
          {locale === "pt" ? "O calendário editorial está disponível no plano Pro e superiores." : "The editorial calendar is available on the Pro plan and above."}{" "}
          <Link href="/dashboard/billing" className="font-semibold text-brand underline">{t("common.upgrade")}</Link>
        </div>
      </div>
    );
  }

  const [entries, brands] = await Promise.all([
    supabase.from("calendar_entries").select("*").order("date"),
    supabase.from("brands").select("id,name,voice,created_at").order("created_at"),
  ]);

  return (
    <div className="animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("side.calendar")}</h1>
      <CalendarBoard initial={(entries.data ?? []) as CalendarEntry[]} brands={(brands.data ?? []) as Brand[]} />
    </div>
  );
}
