"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export interface ConnInfo {
  provider: "tiktok" | "instagram";
  configured: boolean;
  missing: string[];
  redirect: string;
  connection: { username: string | null; status: "connected" | "expired" | "error"; lastError: string | null; lastSyncedAt: string | null } | null;
}

const NAME = { tiktok: "TikTok", instagram: "Instagram" } as const;

export function ConnectionsPanel({
  infos, flash,
}: {
  infos: ConnInfo[];
  flash: { connected?: string; error?: string; syncError?: string };
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const errText: Record<string, [string, string]> = {
    not_configured: ["This connection is not set up on this site yet.", "Esta ligação ainda não está configurada neste site."],
    no_encryption_key: ["The site is missing its token encryption key, so connections are disabled.", "O site não tem a chave de encriptação de tokens, por isso as ligações estão desativadas."],
    denied: ["You declined the connection on the platform. Nothing was connected.", "Recusou a ligação na plataforma. Nada foi ligado."],
    invalid_state: ["The security check failed. Please try connecting again.", "A verificação de segurança falhou. Tente ligar novamente."],
    connect_failed: ["The platform did not accept the connection. Please try again.", "A plataforma não aceitou a ligação. Tente novamente."],
    no_code: ["The platform did not return an authorization. Please try again.", "A plataforma não devolveu autorização. Tente novamente."],
    unknown_provider: ["Unknown platform.", "Plataforma desconhecida."],
  };
  const pick = (k: string) => (errText[k] ? errText[k][pt ? 1 : 0] : pt ? "Algo correu mal." : "Something went wrong.");

  const banner =
    flash.error ? { ok: false, text: pick(flash.error) }
    : flash.connected ? { ok: !flash.syncError, text: flash.syncError ? (pt ? "Conta ligada, mas a primeira sincronização falhou. Tente sincronizar novamente." : "Account connected, but the first sync failed. Try syncing again.") : pt ? "Conta ligada e sincronizada." : "Account connected and synced." }
    : null;
  const shown = msg ?? banner;

  async function sync(p: string) {
    setBusy(p + "sync"); setMsg(null);
    const res = await fetch(`/api/social/${p}/sync`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok
      ? { ok: true, text: pt ? `Sincronizado: ${d.inserted} novas, ${d.updated} atualizadas.` : `Synced: ${d.inserted} new, ${d.updated} updated.` }
      : { ok: false, text: d.error ?? (pt ? "Falha ao sincronizar." : "Sync failed.") });
    router.refresh();
  }
  async function disconnect(p: string) {
    if (!confirm(pt ? "Desligar esta conta? Os tokens guardados serão apagados." : "Disconnect this account? The stored tokens will be deleted.")) return;
    setBusy(p + "del"); setMsg(null);
    const res = await fetch(`/api/social/${p}`, { method: "DELETE" });
    setBusy(null);
    setMsg(res.ok ? { ok: true, text: pt ? "Conta desligada." : "Account disconnected." } : { ok: false, text: pt ? "Não foi possível desligar." : "Could not disconnect." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {shown && <p role="status" className={`rounded-lg border p-3 text-sm ${shown.ok ? "border-border bg-surface2" : "border-danger/40 bg-danger/10 text-danger"}`}>{shown.text}</p>}
      {infos.map((i) => {
        const c = i.connection;
        const state = c ? c.status : i.configured ? "off" : "unavailable";
        const label = {
          connected: pt ? "Ligada" : "Connected",
          expired: pt ? "Expirada: ligue novamente" : "Expired: reconnect",
          error: pt ? "Erro" : "Error",
          off: pt ? "Não ligada" : "Not connected",
          unavailable: pt ? "Indisponível" : "Unavailable",
        }[state];
        return (
          <div key={i.provider} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{NAME[i.provider]}{c?.username ? ` · ${c.username}` : ""}</h2>
              <span className={state === "connected" ? "badge" : "badge-soon"}>{label}</span>
            </div>
            {c?.lastSyncedAt && <p className="text-xs text-muted">{pt ? "Última sincronização" : "Last sync"}: {new Date(c.lastSyncedAt).toLocaleString(pt ? "pt-PT" : "en-US")}</p>}
            {c && c.status !== "connected" && c.lastError && <p className="text-xs text-danger">{c.lastError}</p>}

            {!i.configured && (
              <p className="rounded-lg border border-border bg-surface2 p-3 text-xs text-muted">
                {pt
                  ? "O dono do site ainda não configurou esta ligação (precisa de uma app aprovada na plataforma). Até lá, use o registo manual. Em falta: "
                  : "The site owner has not set up this connection yet (it needs an app approved by the platform). Until then, use manual logging. Missing: "}
                <code>{i.missing.join(", ")}</code>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {i.configured && (!c || c.status !== "connected") && (
                // Full navigation on purpose: this is an OAuth redirect, not a fetch.
                <a href={`/api/social/${i.provider}/connect`} className="btn-primary !px-3 !py-2">
                  {c ? (pt ? "Ligar novamente" : "Reconnect") : pt ? `Ligar ${NAME[i.provider]}` : `Connect ${NAME[i.provider]}`}
                </a>
              )}
              {c && c.status === "connected" && (
                <button type="button" className="btn-secondary !px-3 !py-2" disabled={busy !== null} onClick={() => sync(i.provider)}>
                  {busy === i.provider + "sync" ? "…" : pt ? "Sincronizar agora" : "Sync now"}
                </button>
              )}
              {c && (
                <button type="button" className="btn-ghost !px-3 !py-2" disabled={busy !== null} onClick={() => disconnect(i.provider)}>
                  {pt ? "Desligar" : "Disconnect"}
                </button>
              )}
              <Link href="/dashboard/results" className="btn-ghost !px-3 !py-2">{pt ? "Registar manualmente" : "Log manually"}</Link>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        {pt
          ? "Só lemos as publicações e as métricas da conta que autorizar. Pode desligar a qualquer momento; as publicações já importadas ficam em Resultados e pode eliminá-las."
          : "We only read the posts and metrics of the account you authorize. You can disconnect at any time; already imported posts stay in Results and you can delete them."}
      </p>
    </div>
  );
}
