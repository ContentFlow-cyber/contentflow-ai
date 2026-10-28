"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, RefreshCw, Save, Sparkles, Star } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import {
  GOALS, LANGUAGES, OPTION_LABELS, PLATFORMS, PLATFORM_LABELS, TONES, pick, type FieldKey, type Lng, type ToolMeta,
} from "@/lib/tool-meta";
import { formatNumber } from "@/lib/format";
import type { Brand, Generation } from "@/lib/types";

interface Defaults {
  platform?: string | null;
  tone?: string | null;
  language?: string | null;
}

interface CalEntry {
  day: number; platform: string; topic: string; format: string; idea: string; date: string;
}

export function ToolRunner({
  meta, cost, balance, brands, defaults, perms, initial,
}: {
  meta: ToolMeta;
  cost: number;
  balance: number;
  brands: Brand[];
  defaults: Defaults;
  initial?: { topic?: string; audience?: string; platform?: string | null; goal?: string };
  perms: { favorite: boolean; export: boolean; calendar: boolean; brandVoice: boolean };
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const lng = (locale === "pt" ? "pt" : "en") as Lng;
  const opt = OPTION_LABELS[lng];

  const [form, setForm] = useState({
    topic: initial?.topic ?? "", audience: initial?.audience ?? "", extra: "",
    platform: [initial?.platform, defaults.platform].find((p) => p && (PLATFORMS as readonly string[]).includes(p)) ?? "instagram",
    language: defaults.language ?? locale,
    tone: defaults.tone && (TONES as readonly string[]).includes(defaults.tone) ? defaults.tone : "professional",
    goal: initial?.goal && (GOALS as readonly string[]).includes(initial.goal) ? initial.goal : "engagement", length: "medium", emojis: true, hashtags: true,
    brand_id: "", days: 7, startDate: "", imageSize: "square",
  });
  const [bal, setBal] = useState(balance);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; required?: string } | null>(null);
  const [gen, setGen] = useState<Generation | null>(null);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const has = (k: FieldKey) => meta.fields.includes(k);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const insufficient = bal < cost;

  async function run() {
    setError(null);
    setNote(null);
    setBusy(true);
    const body: Record<string, unknown> = {
      topic: form.topic, audience: form.audience, extra: form.extra, platform: form.platform, language: form.language,
      tone: form.tone, goal: form.goal, length: form.length, emojis: form.emojis, hashtags: form.hashtags,
      days: form.days, imageSize: form.imageSize,
    };
    if (form.brand_id) body.brand_id = form.brand_id;
    if (form.startDate) body.startDate = form.startDate;
    try {
      const res = await fetch(`/api/generate/${meta.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: data.error ?? t("common.error"), code: data.code, required: data.required });
        if (typeof data.balance === "number") setBal(data.balance);
      } else {
        setGen(data.generation as Generation);
        setText((data.generation as Generation).text);
        setImageUrl(data.image_url ?? null);
        setBal(data.wallet.total);
        router.refresh(); // updates the balance in the header
      }
    } catch {
      setError({ message: t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    if (!gen) return;
    const res = await fetch(`/api/generations/${gen.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNote(data.error ?? t("common.error"));
      return;
    }
    setGen(data.generation as Generation);
    setNote(t("settings.saved"));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNote(t("tool.copied"));
    } catch {
      setNote(t("common.error"));
    }
  }

  function exportTxt() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${meta.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function addAllToCalendar() {
    const entries = ((gen?.output as { entries?: CalEntry[] })?.entries ?? []).map((e) => ({
      date: e.date, platform: e.platform, topic: e.topic, format: e.format, idea: e.idea, status: "planned" as const,
      brand_id: form.brand_id || null,
    }));
    const res = await fetch("/api/calendar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entries }) });
    const data = await res.json().catch(() => ({}));
    setNote(res.ok ? `${entries.length} ✓` : data.error ?? t("common.error"));
    if (res.ok) router.push("/dashboard/calendar");
  }

  const select = (label: string, key: keyof typeof form, options: { value: string; label: string }[]) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={String(form[key])} onChange={(e) => set(key, e.target.value as never)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const entries = (gen?.output as { entries?: CalEntry[] } | undefined)?.entries;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="card space-y-4">
        {has("topic") && (
          <div>
            <label className="label">{meta.topicLabel ? pick(meta.topicLabel, lng) : t("f.topic")}</label>
            {meta.kind === "image" || meta.id === "blog" || meta.id === "ad" ? (
              <textarea className="input min-h-24" maxLength={2000} value={form.topic} onChange={(e) => set("topic", e.target.value)} />
            ) : (
              <input className="input" maxLength={2000} value={form.topic} onChange={(e) => set("topic", e.target.value)} />
            )}
          </div>
        )}
        {has("extra") && (
          <div>
            <label className="label">{meta.extraLabel ? pick(meta.extraLabel, lng) : "…"}</label>
            <textarea className={`input ${meta.requiredExtra ? "min-h-40" : "min-h-20"}`} maxLength={6000} value={form.extra} onChange={(e) => set("extra", e.target.value)} />
          </div>
        )}
        {has("audience") && (
          <div>
            <label className="label">{t("f.audience")}</label>
            <input className="input" maxLength={300} value={form.audience} onChange={(e) => set("audience", e.target.value)} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {has("platform") && select(t("f.platform"), "platform", PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] })))}
          {has("language") && select(t("f.language"), "language", LANGUAGES.map((l) => ({ value: l.code, label: l.name })))}
          {has("tone") && select(t("f.tone"), "tone", TONES.map((x) => ({ value: x, label: opt[x] })))}
          {has("goal") && select(t("f.goal"), "goal", GOALS.map((x) => ({ value: x, label: opt[x] })))}
          {has("length") && select(t("f.length"), "length", ["short", "medium", "long"].map((x) => ({ value: x, label: opt[x] })))}
          {has("imageSize") && select(t("f.imageSize"), "imageSize", ["square", "portrait", "landscape"].map((x) => ({ value: x, label: opt[x] })))}
          {has("days") && (
            <div>
              <label className="label">{t("f.days")}</label>
              <select className="input" value={form.days} onChange={(e) => set("days", Number(e.target.value))}>
                <option value={7}>7</option>
                <option value={30}>30</option>
              </select>
            </div>
          )}
          {has("startDate") && (
            <div>
              <label className="label">{t("f.startDate")}</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          )}
        </div>
        {has("brand") && perms.brandVoice && brands.length > 0 && (
          <div>
            <label className="label">{t("f.brand")}</label>
            <select className="input" value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
              <option value="">{t("f.noBrand")}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        {(has("emojis") || has("hashtags")) && (
          <div className="flex flex-wrap gap-6">
            {has("emojis") && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.emojis} onChange={(e) => set("emojis", e.target.checked)} /> {t("f.emojis")}</label>
            )}
            {has("hashtags") && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.hashtags} onChange={(e) => set("hashtags", e.target.checked)} /> {t("f.hashtags")}</label>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface2 p-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-muted">{t("tool.cost")}</p><p className="font-bold">{formatNumber(cost, locale)}</p></div>
            <div><p className="text-xs text-muted">{t("tool.balance")}</p><p className="font-bold">{formatNumber(bal, locale)}</p></div>
            <div><p className="text-xs text-muted">{t("tool.after")}</p><p className={`font-bold ${insufficient ? "text-danger" : ""}`}>{formatNumber(Math.max(0, bal - cost), locale)}</p></div>
          </div>
          {insufficient && (
            <p className="mt-2 text-center text-xs text-danger">
              {t("tool.insufficient")}{" "}
              <Link href="/dashboard/coins" className="font-semibold underline">{t("common.buyCoins")}</Link> ·{" "}
              <Link href="/dashboard/billing" className="font-semibold underline">{t("common.upgrade")}</Link>
            </p>
          )}
        </div>

        <button type="button" className="btn-primary w-full" disabled={busy || insufficient} onClick={run}>
          <Sparkles className="h-4 w-4" /> {busy ? t("tool.working") : gen ? t("tool.regenerate") : t("tool.generate")} · {cost} {t("common.coins")}
        </button>

        {error && (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">
            <p className="text-danger">{error.message}</p>
            {(error.code === "insufficient_coins" || error.code === "plan_required") && (
              <p className="mt-2 flex gap-3 text-xs font-semibold">
                <Link href="/dashboard/coins" className="underline">{t("common.buyCoins")}</Link>
                <Link href="/dashboard/billing" className="underline">{t("common.upgrade")}</Link>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card min-h-64">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("tool.result")}</h2>
          {note && <span className="text-xs text-muted">{note}</span>}
        </div>

        {!gen && !busy && <p className="py-10 text-center text-sm text-muted">{t("tool.empty")}</p>}
        {busy && <p className="py-10 text-center text-sm text-muted animate-pulse">{t("tool.working")}</p>}

        {gen && !busy && (
          <div className="space-y-3">
            {meta.kind === "image" && imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={text} className="w-full rounded-xl border border-border" />
            )}
            {meta.kind === "calendar" && entries ? (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {entries.map((e, i) => (
                  <div key={i} className="rounded-xl border border-border p-3 text-sm">
                    <p className="text-xs font-semibold text-brand">{e.date} · {e.platform} · {e.format}</p>
                    <p className="font-semibold">{e.topic}</p>
                    <p className="text-muted">{e.idea}</p>
                  </div>
                ))}
              </div>
            ) : meta.kind !== "image" ? (
              <textarea className="input min-h-72 font-mono text-[13px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
            ) : null}

            <div className="flex flex-wrap gap-2">
              {meta.kind !== "image" && <button type="button" className="btn-secondary !px-3 !py-2" onClick={copy}><Copy className="h-4 w-4" /> {t("tool.copy")}</button>}
              {meta.kind === "text" && text !== gen.text && (
                <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => patch({ text })}><Save className="h-4 w-4" /> {t("tool.save")}</button>
              )}
              <button type="button" className="btn-secondary !px-3 !py-2" disabled={busy || insufficient} onClick={run}><RefreshCw className="h-4 w-4" /> {t("tool.regenerate")}</button>
              {perms.favorite ? (
                <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => patch({ is_favorite: !gen.is_favorite })}>
                  <Star className={`h-4 w-4 ${gen.is_favorite ? "fill-current text-warn" : ""}`} /> {gen.is_favorite ? t("tool.unfavorite") : t("tool.favorite")}
                </button>
              ) : (
                <Link href="/dashboard/billing" className="btn-ghost !px-3 !py-2 text-xs"><Star className="h-4 w-4" /> {t("tool.favorite")} · Pro</Link>
              )}
              {meta.kind !== "image" && (perms.export ? (
                <button type="button" className="btn-secondary !px-3 !py-2" onClick={exportTxt}><Download className="h-4 w-4" /> {t("tool.export")}</button>
              ) : (
                <Link href="/dashboard/billing" className="btn-ghost !px-3 !py-2 text-xs"><Download className="h-4 w-4" /> {t("tool.export")} · Pro</Link>
              ))}
              {meta.kind === "image" && imageUrl && (
                <a className="btn-secondary !px-3 !py-2" href={imageUrl} download target="_blank" rel="noreferrer"><Download className="h-4 w-4" /> {t("tool.export")}</a>
              )}
              {meta.kind === "calendar" && perms.calendar && (
                <button type="button" className="btn-primary !px-3 !py-2" onClick={addAllToCalendar}>{t("tool.addCalendar")}</button>
              )}
            </div>
            <p className="text-xs text-muted">{locale === "pt" ? "Conteúdo gerado por IA: reveja antes de publicar." : "AI-generated content: review before publishing."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
