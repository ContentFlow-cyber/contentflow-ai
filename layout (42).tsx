import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/dashboard/Shell";
import { getWallet, getPlan } from "@/lib/wallet";
import type { PlanId, Wallet } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="card border-warn/40 bg-warn/10 text-sm">{children}</div>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <Notice>The site is not configured yet. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</Notice>;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Two-step verification: a password-only (aal1) session must not reach the dashboard when MFA is on.
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") redirect("/login?next=/dashboard");

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return <Notice>The server is missing <code>SUPABASE_SERVICE_ROLE_KEY</code>. Add it to the environment variables and redeploy.</Notice>;
  }

  let wallet: Wallet;
  try {
    wallet = await getWallet(user.id, admin);
  } catch {
    return <Notice>Could not load your wallet. Make sure you ran <code>supabase/migrations/001_init.sql</code> in your Supabase project.</Notice>;
  }
  const [{ data: profile }, plan] = await Promise.all([
    admin.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle(),
    getPlan(admin, wallet.plan_id as PlanId),
  ]);

  return (
    <DashboardShell
      balance={wallet.total}
      planName={plan?.name ?? wallet.plan_id}
      planId={wallet.plan_id as PlanId}
      name={profile?.full_name || user.email || ""}
    >
      {children}
    </DashboardShell>
  );
}
