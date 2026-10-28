import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n-server";
import { encryptionConfigured } from "@/lib/crypto";
import { credentials, missingEnv, PROVIDERS, redirectUri } from "@/lib/social";
import { ConnectionsPanel, type ConnInfo } from "@/components/dashboard/ConnectionsPanel";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tokens are never selected: only non-secret status columns leave the database.
  const { data } = await createAdminClient()
    .from("social_connections")
    .select("provider,username,status,last_error,last_synced_at,expires_at")
    .eq("user_id", user.id);
  const rows = new Map((data ?? []).map((r: { provider: string }) => [r.provider, r]));

  const enc = encryptionConfigured();
  const infos: ConnInfo[] = PROVIDERS.map((p) => {
    const r = rows.get(p) as { username: string | null; status: "connected" | "expired" | "error"; last_error: string | null; last_synced_at: string | null } | undefined;
    return {
      provider: p,
      configured: !!credentials(p) && enc,
      missing: [...missingEnv(p), ...(enc ? [] : ["TOKEN_ENCRYPTION_KEY"])],
      redirect: redirectUri(p),
      connection: r ? { username: r.username, status: r.status, lastError: r.last_error, lastSyncedAt: r.last_synced_at } : null,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("side.connections")}</h1>
        <p className="mt-1 text-sm text-muted">
          {locale === "pt"
            ? "Ligue a sua conta pelo login oficial da rede social para importar as métricas reais das suas publicações. Nunca pedimos a sua palavra-passe. Sem ligação, pode sempre registar os resultados manualmente."
            : "Connect your account through the platform's official login to import real metrics for your posts. We never ask for your password. Without a connection you can always log results manually."}
        </p>
      </div>
      <ConnectionsPanel infos={infos} flash={{ connected: sp.connected, error: sp.error, syncError: sp.sync_error }} />
    </div>
  );
}
