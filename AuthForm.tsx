"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";

type Mode = "login" | "signup" | "forgot" | "reset";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");
  const [accepted, setAccepted] = useState(false);

  if (!isSupabaseConfigured) {
    return <p className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">{t("auth.notConfigured")}</p>;
  }

  async function onMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const ch = await supabase.auth.mfa.challenge({ factorId: mfa.factorId });
    const v = ch.error ? null : await supabase.auth.mfa.verify({ factorId: mfa.factorId, challengeId: ch.data.id, code: code.trim() });
    setBusy(false);
    if (!v || v.error) {
      setError(locale === "pt" ? "Código inválido. Tente novamente." : "Invalid code. Please try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === "signup" && !accepted) {
      setError(locale === "pt" ? "Tem de aceitar os Termos e a Política de Privacidade." : "You must accept the Terms and the Privacy Policy.");
      return;
    }
    if ((mode === "signup" || mode === "reset") && password.length < 8) {
      setError(t("auth.minPassword"));
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") {
          const factors = await supabase.auth.mfa.listFactors();
          const totp = factors.data?.totp?.[0];
          if (!totp) throw new Error(locale === "pt" ? "Não foi possível iniciar a verificação em dois passos." : "Could not start two-step verification.");
          setMfa({ factorId: totp.id });
          return;
        }
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setInfo(t("auth.checkEmail"));
        }
      } else if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
        setInfo(t("auth.resetSent")); // same message whether or not the email exists
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const title = { login: t("auth.login"), signup: t("auth.signup"), forgot: t("auth.forgot"), reset: t("auth.newPassword") }[mode];
  const cta = { login: t("auth.login"), signup: t("auth.signup"), forgot: t("auth.sendReset"), reset: t("auth.updatePassword") }[mode];

  if (mfa) {
    const pt = locale === "pt";
    return (
      <form onSubmit={onMfa} className="card w-full max-w-md space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{pt ? "Verificação em dois passos" : "Two-step verification"}</h1>
        <p className="text-sm text-muted">{pt ? "Introduza o código de 6 dígitos da sua aplicação de autenticação." : "Enter the 6-digit code from your authenticator app."}</p>
        <input className="input text-center text-xl tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? t("common.loading") : pt ? "Verificar" : "Verify"}</button>
        <button type="button" className="btn-ghost w-full" onClick={async () => { await createClient().auth.signOut(); setMfa(null); setCode(""); setPassword(""); }}>{pt ? "Cancelar" : "Cancel"}</button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">{t("auth.name")}</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </div>
      )}
      {mode !== "reset" && (
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
      )}
      {mode !== "forgot" && (
        <div>
          <label className="label" htmlFor="password">{mode === "reset" ? t("auth.newPassword") : t("auth.password")}</label>
          <input
            id="password" type="password" required minLength={mode === "login" ? 1 : 8} className="input"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
      )}

      {mode === "signup" && (
        <label className="flex items-start gap-2 text-xs normal-case text-muted">
          <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
          <span>
            {locale === "pt" ? "Li e aceito os " : "I have read and accept the "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand">{locale === "pt" ? "Termos" : "Terms"}</Link>
            {locale === "pt" ? " e a " : " and the "}
            <Link href="/privacy" target="_blank" className="font-semibold text-brand">{locale === "pt" ? "Política de Privacidade" : "Privacy Policy"}</Link>.
          </span>
        </label>
      )}

      {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {info && <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm">{info}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? t("common.loading") : cta}</button>

      <div className="space-y-1 text-center text-sm text-muted">
        {mode === "login" && (
          <>
            <p><Link href="/forgot-password" className="font-semibold text-brand">{t("auth.forgot")}</Link></p>
            <p>{t("auth.noAccount")} <Link href="/signup" className="font-semibold text-brand">{t("auth.signup")}</Link></p>
          </>
        )}
        {mode === "signup" && <p>{t("auth.haveAccount")} <Link href="/login" className="font-semibold text-brand">{t("auth.login")}</Link></p>}
        {mode === "forgot" && <p><Link href="/login" className="font-semibold text-brand">{t("auth.login")}</Link></p>}
      </div>
    </form>
  );
}
