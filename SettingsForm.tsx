"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, OPTION_LABELS, PLATFORMS, PLATFORM_LABELS, TONES, type Lng } from "@/lib/tool-meta";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";

interface Props {
  userId: string;
  email: string;
  profile: { full_name: string; language: string; currency: string };
  prefs: { default_platform: string | null; default_tone: string | null; default_language: string | null; brand_voice: string };
  canBrandVoice: boolean;
}

export function SettingsForm({ userId, email, profile, prefs, canBrandVoice }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const lng = (locale === "pt" ? "pt" : "en") as Lng;
  const [p, setP] = useState(profile);
  const [d, setD] = useState({ ...prefs, default_platform: prefs.default_platform ?? "instagram", default_tone: prefs.default_tone ?? "professional", default_language: prefs.default_language ?? locale });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const supabase = createClient();
    // Browser writes are limited by database privileges to these columns only.
    const a = await supabase.from("profiles").update({ language: p.language, currency: p.currency }).eq("id", userId);
    const b = await supabase.from("preferences").update({
      default_platform: d.default_platform, default_tone: d.default_tone, default_language: d.default_language,
      ...(canBrandVoice ? { brand_voice: d.brand_voice.slice(0, 1500) } : {}),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    setBusy(false);
    if (a.error || b.error) {
      setErr(t("common.error"));
      return;
    }
    document.cookie = `lang=${p.language}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `cur=${p.currency}; path=/; max-age=31536000; samesite=lax`;
    setMsg(t("settings.saved"));
    router.refresh();
  }

  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"), []);
  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch { /* storage may be blocked */ }
  }

  async function del() {
    const word = locale === "pt" ? "ELIMINAR" : "DELETE";
    if (prompt(`${t("settings.deleteWarn")}\n\n${locale === "pt" ? "Escreva" : "Type"} ${word}:`) !== word) return;
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await createClient().auth.signOut();
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? t("common.error"));
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-bold">{t("settings.profile")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Interface</label>
              <select className="input" value={p.language} onChange={(e) => setP({ ...p, language: e.target.value })}>
                {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{locale === "pt" ? "Moeda dos preços" : "Price currency"}</label>
              <select className="input" value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })}>
                <option value="eur">EUR €</option>
                <option value="usd">USD $</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">{locale === "pt" ? "Aparência" : "Appearance"}</h2>
          <div className="flex gap-3">
            {(["light", "dark"] as const).map((m) => (
              <button key={m} type="button" onClick={() => applyTheme(m)} aria-pressed={theme === m}
                className={`flex-1 rounded-xl border p-3 text-sm font-semibold ${theme === m ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface2"}`}>
                {m === "light" ? (locale === "pt" ? "☀️ Claro" : "☀️ Light") : locale === "pt" ? "🌙 Escuro" : "🌙 Dark"}
              </button>
            ))}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-bold">{t("settings.prefs")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t("f.platform")}</label>
              <select className="input" value={d.default_platform} onChange={(e) => setD({ ...d, default_platform: e.target.value })}>
                {PLATFORMS.map((x) => <option key={x} value={x}>{PLATFORM_LABELS[x]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("f.tone")}</label>
              <select className="input" value={d.default_tone} onChange={(e) => setD({ ...d, default_tone: e.target.value })}>
                {TONES.map((x) => <option key={x} value={x}>{OPTION_LABELS[lng][x]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("f.language")}</label>
              <select className="input" value={d.default_language} onChange={(e) => setD({ ...d, default_language: e.target.value })}>
                {LANGUAGES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">{t("settings.brandVoice")} {!canBrandVoice && <span className="badge-soon ml-2">Pro</span>}</label>
            <textarea
              className="input min-h-24 disabled:opacity-50" disabled={!canBrandVoice} maxLength={1500} value={d.brand_voice}
              placeholder={locale === "pt" ? "Descreva o estilo da sua marca…" : "Describe your brand's style…"}
              onChange={(e) => setD({ ...d, brand_voice: e.target.value })}
            />
          </div>
        </section>

        {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{err}</p>}
        {msg && <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 p-2 text-sm">{msg}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
      </form>

      <section className="card space-y-3">
        <h2 className="font-bold">{locale === "pt" ? "Os seus dados (RGPD)" : "Your data (GDPR)"}</h2>
        <div className="flex flex-wrap gap-3">
          <a className="btn-secondary" href="/api/account" download>{t("settings.export")}</a>
          <button type="button" className="btn-danger" onClick={del}>{t("settings.delete")}</button>
        </div>
        <p className="text-xs text-muted">{t("settings.deleteWarn")}</p>
      </section>
    </div>
  );
}
