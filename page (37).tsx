import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { getPlan, getWallet } from "@/lib/wallet";
import { ProfileList } from "@/components/dashboard/ProfileList";
import { MfaCard } from "@/components/dashboard/MfaCard";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import type { PlanId } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const wallet = await getWallet(user!.id, admin);
  const plan = await getPlan(admin, wallet.plan_id as PlanId);
  const [profile, prefs] = await Promise.all([
    supabase.from("profiles").select("full_name,nickname,gender,birthday,avatar_url,language,currency").maybeSingle(),
    supabase.from("preferences").select("default_platform,default_tone,default_language,brand_voice").maybeSingle(),
  ]);

  return (
    <div className="animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("settings.title")}</h1>
      <div className="mb-6 space-y-4">
        <h2 className="font-bold">{locale === "pt" ? "Informações pessoais" : "Personal information"}</h2>
        <ProfileList
          data={{
            userId: user!.id, email: user!.email ?? "", emailVerified: Boolean(user!.email_confirmed_at),
            fullName: profile.data?.full_name ?? "", nickname: profile.data?.nickname ?? "",
            gender: profile.data?.gender ?? null, birthday: profile.data?.birthday ?? null, avatarUrl: profile.data?.avatar_url ?? null,
          }}
        />
        <MfaCard />
        <h2 className="pt-2 font-bold">{locale === "pt" ? "Preferências e conta" : "Preferences and account"}</h2>
      </div>
      <SettingsForm
        userId={user!.id}
        email={user!.email ?? ""}
        profile={{ full_name: profile.data?.full_name ?? "", language: profile.data?.language ?? "en", currency: profile.data?.currency ?? "eur" }}
        prefs={{
          default_platform: prefs.data?.default_platform ?? null,
          default_tone: prefs.data?.default_tone ?? null,
          default_language: prefs.data?.default_language ?? null,
          brand_voice: prefs.data?.brand_voice ?? "",
        }}
        canBrandVoice={Boolean(plan?.can_brand_voice)}
      />
    </div>
  );
}
