"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";

/** Real two-step verification (TOTP authenticator app) via Supabase Auth MFA. */
export function MfaCard() {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [factorId, setFactorId] = useState<string | null>(null); // verified factor
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  async function load() {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactorId(data?.totp?.[0]?.id ?? null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function start() {
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    // Clean up half-finished enrolments first.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `ContentFlow ${Date.now()}` });
    setBusy(false);
    if (error || !data) return setErr(error?.message ?? (pt ? "Não foi possível iniciar." : "Could not start."));
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const ch = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    const v = ch.error ? null : await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.data.id, code });
    setBusy(false);
    if (!v || v.error) return setErr(pt ? "Código inválido. Tente novamente." : "Invalid code. Please try again.");
    setEnroll(null);
    setCode("");
    await load();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    // Removing a verified factor requires a fresh two-step check.
    const ch = await supabase.auth.mfa.challenge({ factorId });
    const v = ch.error ? null : await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (!v || v.error) { setBusy(false); return setErr(pt ? "Código inválido. Tente novamente." : "Invalid code. Please try again."); }
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return setErr(error.message);
    setDisabling(false);
    setCode("");
    await load();
  }

  const on = !!factorId;
  return (
    <section className="card space-y-3">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><ShieldCheck className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            {pt ? "Verificação em dois passos (MFA)" : "Two-step verification (MFA)"}
            <span className={on ? "badge" : "badge-soon"}>{loading ? "…" : on ? (pt ? "Ativada" : "On") : pt ? "Não ativada" : "Off"}</span>
          </p>
          <p className="text-sm text-muted">{pt ? "Proteja a sua conta e as suas moedas com um código da aplicação de autenticação." : "Protect your account and coins with a code from an authenticator app."}</p>
        </div>
        <button
          type="button" role="switch" aria-checked={on} aria-label="MFA" disabled={loading || busy}
          onClick={() => { setErr(null); if (on) setDisabling((v) => !v); else if (!enroll) void start(); else setEnroll(null); }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on || enroll ? "bg-brand" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on || enroll ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {enroll && (
        <form onSubmit={verifyEnroll} className="space-y-3 border-t border-border pt-4 text-sm">
          <p>{pt ? "1. Leia o código QR com Google Authenticator, Authy ou 1Password." : "1. Scan the QR code with Google Authenticator, Authy or 1Password."}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR" className="h-40 w-40 rounded-lg bg-white p-2" />
          <p className="text-xs text-muted">{pt ? "Ou introduza esta chave manualmente:" : "Or enter this key manually:"} <code className="break-all">{enroll.secret}</code></p>
          <p>{pt ? "2. Introduza o código de 6 dígitos para confirmar." : "2. Enter the 6-digit code to confirm."}</p>
          <input className="input max-w-[200px] text-center tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !px-4 !py-2" disabled={busy || code.length !== 6}>{pt ? "Ativar" : "Turn on"}</button>
            <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setEnroll(null)}>{pt ? "Cancelar" : "Cancel"}</button>
          </div>
        </form>
      )}

      {on && disabling && (
        <form onSubmit={disable} className="space-y-3 border-t border-border pt-4 text-sm">
          <p>{pt ? "Para desativar, introduza o código atual da sua aplicação." : "To turn off, enter the current code from your app."}</p>
          <input className="input max-w-[200px] text-center tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !px-4 !py-2" disabled={busy || code.length !== 6}>{pt ? "Desativar" : "Turn off"}</button>
            <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setDisabling(false)}>{pt ? "Cancelar" : "Cancel"}</button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{err}</p>}
      {on && !disabling && <p className="text-xs text-muted">{pt ? "Se perder o acesso à aplicação, não conseguirá entrar sem o código. Guarde a chave num local seguro." : "If you lose access to the app you cannot log in without the code. Keep the key somewhere safe."}</p>}
    </section>
  );
}
