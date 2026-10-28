"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { GOAL_LABELS, STRATEGY_GOALS } from "@/lib/strategy";
import { PLATFORM_LABELS } from "@/lib/tool-meta";
import type { PostRow } from "@/lib/insights";

export type ResultPost = PostRow & { url: string | null; generation_id: string | null };

const PLATFORM_IDS = ["instagram", "tiktok", "facebook", "linkedin", "youtube", "x"] as const;
const METRICS = ["views", "likes", "comments", "shares", "saves", "reach"] as const;
type Metric = (typeof METRICS)[number];
const METRIC_LABEL: Record<Metric, { en: string; pt: string }> = {
  views: { en: "Views", pt: "Visualizações" },
  likes: { en: "Likes", pt: "Gostos" },
  comments: { en: "Comments", pt: "Comentários" },
  shares: { en: "Shares", pt: "Partilhas" },
  saves: { en: "Saves", pt: "Guardados" },
  reach: { en: "Reach", pt: "Alcance" },
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  platform: "instagram", title: "", format: "", topic: "", objective: "", published_at: today(), url: "", generation_id: "",
  views: "", likes: "", comments: "", shares: "", saves: "", reach: "",
});

export function ResultsManager({
  initial, creations,
}: {
  initial: ResultPost[];
  creations: { id: string; title: string }[];
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const pt = locale === "pt";
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<ResultPost | null>(null);
  const [open, setOpen] = useState(initial.length === 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));
  const synced = editing?.source === "synced";

  function startEdit(p: ResultPost) {
    setEditing(p);
    setOpen(true);
    setErr(null);
    setForm({
      platform: p.platform, title: p.title, format: p.format, topic: p.topic, objective: p.objective ?? "",
      published_at: p.published_at, url: p.url ?? "", generation_id: p.generation_id ?? "",
      views: p.views?.toString() ?? "", likes: p.likes?.toString() ?? "", comments: p.comments?.toString() ?? "",
      shares: p.shares?.toString() ?? "", saves: p.saves?.toString() ?? "", reach: p.reach?.toString() ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    for (const m of METRICS) {
      const v = num(form[m]);
      if (v !== null && !Number.isFinite(v)) return setErr(pt ? "Os números têm de ser válidos." : "Numbers must be valid.");
    }
    setBusy(true);
    const labels = { format: form.format, topic: form.topic, objective: form.objective || null };
    const body = editing && synced
      ? labels
      : {
          ...labels, platform: form.platform, title: form.title, published_at: form.published_at, url: form.url || (editing ? null : undefined),
          views: num(form.views), likes: num(form.likes), comments: num(form.comments), shares: num(form.shares), saves: num(form.saves), reach: num(form.reach),
          ...(editing ? {} : { generation_id: form.generation_id || null }),
        };
    const res = await fetch(editing ? `/api/posts/${editing.id}` : "/api/posts", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? (pt ? "Algo correu mal." : "Something went wrong."));
    const saved = data.post as ResultPost;
    setRows((r) => (editing ? r.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...r]).sort((a, b) => b.published_at.localeCompare(a.published_at)));
    setEditing(null);
    setForm(emptyForm());
    setOpen(false);
    router.refresh();
  }

  async function remove(p: ResultPost) {
    if (!confirm(pt ? "Eliminar este resultado?" : "Delete this result?")) return;
    const res = await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.id !== p.id));
      router.refresh();
    }
  }

  const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString(pt ? "pt-PT" : "en-US"));

  return (
    <div className="space-y-6">
      {!open && (
        <button type="button" className="btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>
          <Plus className="h-4 w-4" /> {pt ? "Registar resultados de uma publicação" : "Log results of a post"}
        </button>
      )}

      {open && (
        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{editing ? (pt ? "Editar resultado" : "Edit result") : pt ? "Registar resultados" : "Log results"}</h2>
            <span className="badge">{synced ? (pt ? "Sincronizado" : "Synced") : pt ? "Introduzido manualmente" : "Entered manually"}</span>
          </div>
          {synced && (
            <p className="rounded-lg border border-border bg-surface2 p-2 text-xs text-muted">
              {pt ? "Os números vêm da rede social e não podem ser editados. Pode alterar o formato, o tema e o objetivo para melhorar a análise." : "The numbers come from the platform and cannot be edited. You can change the format, topic and objective to improve the analysis."}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{pt ? "Rede social" : "Platform"}</label>
              <select className="input" disabled={synced} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORM_IDS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{pt ? "Título ou descrição curta" : "Title or short description"}</label>
              <input className="input" required disabled={synced} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">{pt ? "Data de publicação" : "Publication date"}</label>
              <input type="date" className="input" required disabled={synced} max={today()} value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} />
            </div>
            <div>
              <label className="label">{pt ? "Tipo de conteúdo" : "Content type"}</label>
              <input className="input" maxLength={60} placeholder={pt ? "ex.: Reel, Carrossel, Texto" : "e.g. Reel, Carousel, Text"} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} />
            </div>
            <div>
              <label className="label">{pt ? "Tema" : "Topic"}</label>
              <input className="input" maxLength={80} placeholder={pt ? "ex.: Preços" : "e.g. Pricing"} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div>
              <label className="label">{pt ? "Objetivo da publicação" : "Goal of the post"}</label>
              <select className="input" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}>
                <option value="">—</option>
                {STRATEGY_GOALS.map((g) => <option key={g} value={g}>{pt ? GOAL_LABELS[g].pt : GOAL_LABELS[g].en}</option>)}
              </select>
            </div>
            {!editing && creations.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label">{pt ? "Criada com o ContentFlow (opcional)" : "Created with ContentFlow (optional)"}</label>
                <select className="input" value={form.generation_id} onChange={(e) => setForm({ ...form, generation_id: e.target.value })}>
                  <option value="">—</option>
                  {creations.map((c) => <option key={c.id} value={c.id}>{c.title.slice(0, 70)}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-3">
              <label className="label">{pt ? "Ligação da publicação (opcional)" : "Post link (optional)"}</label>
              <input type="url" className="input" disabled={synced} maxLength={500} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
          </div>
          <div>
            <p className="label">{pt ? "Resultados (deixe em branco o que não souber: não é contado como zero)" : "Results (leave blank what you do not know: blank is not counted as zero)"}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {METRICS.map((m) => (
                <div key={m}>
                  <label className="mb-1 block text-xs text-muted">{pt ? METRIC_LABEL[m].pt : METRIC_LABEL[m].en}</label>
                  <input type="number" min={0} inputMode="numeric" className="input" disabled={synced} value={form[m]} onChange={(e) => setForm({ ...form, [m]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{err}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "…" : pt ? "Guardar" : "Save"}</button>
            <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm()); setErr(null); }}>{pt ? "Cancelar" : "Cancel"}</button>
          </div>
        </form>
      )}

      {rows.length === 0 && !open && <p className="card text-center text-sm text-muted">{pt ? "Ainda não há resultados registados." : "No results logged yet."}</p>}

      <div className="space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="card !p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.title}</p>
                <p className="text-xs text-muted">
                  {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS] ?? p.platform} · {p.published_at}
                  {p.format ? ` · ${p.format}` : ""}{p.topic ? ` · ${p.topic}` : ""}
                  {p.objective ? ` · ${pt ? GOAL_LABELS[p.objective as keyof typeof GOAL_LABELS]?.pt : GOAL_LABELS[p.objective as keyof typeof GOAL_LABELS]?.en}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={p.source === "synced" ? "badge" : "badge-soon"}>
                  {p.source === "synced" ? (pt ? "Sincronizado" : "Synced") : pt ? "Manual" : "Manual"}
                </span>
                <button type="button" aria-label="Edit" className="btn-ghost !p-2" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label="Delete" className="btn-ghost !p-2" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
              {METRICS.map((m) => (
                <div key={m} className="rounded-lg bg-surface2 px-2 py-1.5">
                  <p className="text-muted">{pt ? METRIC_LABEL[m].pt : METRIC_LABEL[m].en}</p>
                  <p className="font-bold">{fmt(p[m])}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
