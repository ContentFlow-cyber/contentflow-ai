"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/tool-meta";
import type { Brand, CalendarEntry } from "@/lib/types";

const STATUSES = ["planned", "draft", "published"] as const;
const STATUS_LABEL: Record<string, { en: string; pt: string }> = {
  planned: { en: "Planned", pt: "Planeado" },
  draft: { en: "Draft", pt: "Rascunho" },
  published: { en: "Published", pt: "Publicado" },
};

export function CalendarBoard({ initial, brands }: { initial: CalendarEntry[]; brands: Brand[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), platform: "Instagram", topic: "", format: "", idea: "", brand_id: "" });

  const shown = useMemo(() => rows.filter((r) => !filter || r.status === filter), [rows, filter]);

  async function api(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? t("common.error"));
      return null;
    }
    setMsg(null);
    return data;
  }

  async function update(id: string, patch: Partial<CalendarEntry>) {
    const d = await api(`/api/calendar/${id}`, "PATCH", patch);
    if (d) setRows((x) => x.map((r) => (r.id === id ? (d.entry as CalendarEntry) : r)));
  }
  async function remove(id: string) {
    if (await api(`/api/calendar/${id}`, "DELETE")) setRows((x) => x.filter((r) => r.id !== id));
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const d = await api("/api/calendar", "POST", {
      entries: [{ ...draft, brand_id: draft.brand_id || null, status: "planned" }],
    });
    if (d) {
      setRows((x) => [...x, ...(d.entries as CalendarEntry[])].sort((a, b) => a.date.localeCompare(b.date)));
      setDraft((v) => ({ ...v, topic: "", idea: "", format: "" }));
      router.refresh();
    }
  }
  function exportCsv() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["date,platform,topic,format,idea,status", ...rows.map((r) => [r.date, r.platform, r.topic, r.format, r.idea, r.status].map(esc).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "content-calendar.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-6">
        <input type="date" required className="input sm:col-span-1" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <select className="input sm:col-span-1" value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}>
          {PLATFORMS.filter((p) => p !== "all").map((p) => <option key={p} value={PLATFORM_LABELS[p]}>{PLATFORM_LABELS[p]}</option>)}
        </select>
        <input required className="input sm:col-span-2" placeholder={t("f.topic")} maxLength={300} value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
        <input className="input sm:col-span-1" placeholder="Format" maxLength={80} value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })} />
        <button type="submit" className="btn-primary sm:col-span-1"><Plus className="h-4 w-4" /> {locale === "pt" ? "Adicionar" : "Add"}</button>
        <textarea className="input sm:col-span-5" placeholder="Idea / caption" maxLength={1500} value={draft.idea} onChange={(e) => setDraft({ ...draft, idea: e.target.value })} />
        {brands.length > 0 && (
          <select className="input sm:col-span-1" value={draft.brand_id} onChange={(e) => setDraft({ ...draft, brand_id: e.target.value })}>
            <option value="">{t("f.noBrand")}</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <select className="input max-w-[12rem]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t("common.all")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{locale === "pt" ? STATUS_LABEL[s].pt : STATUS_LABEL[s].en}</option>)}
        </select>
        <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</button>
        <span className="ml-auto text-xs text-muted">
          {locale === "pt" ? "Organize e edite aqui. A publicação automática nas redes ainda não está disponível." : "Organise and edit here. Automatic posting to social networks is not available yet."}
        </span>
      </div>
      {msg && <p className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{msg}</p>}

      {shown.length === 0 && <p className="card text-center text-sm text-muted">{t("dash.none")}</p>}
      <div className="space-y-2">
        {shown.map((r) => (
          <div key={r.id} className="card !p-3">
            <div className="grid items-start gap-2 sm:grid-cols-[8rem_9rem_1fr_9rem_auto]">
              <input type="date" className="input" defaultValue={r.date} onBlur={(e) => e.target.value && e.target.value !== r.date && update(r.id, { date: e.target.value })} />
              <input className="input" defaultValue={r.platform} maxLength={40} onBlur={(e) => e.target.value.trim() && e.target.value !== r.platform && update(r.id, { platform: e.target.value.trim() })} />
              <div className="space-y-2">
                <input className="input font-semibold" defaultValue={r.topic} maxLength={300} onBlur={(e) => e.target.value.trim() && e.target.value !== r.topic && update(r.id, { topic: e.target.value.trim() })} />
                <textarea className="input min-h-16 text-xs" defaultValue={r.idea} maxLength={1500} onBlur={(e) => e.target.value !== r.idea && update(r.id, { idea: e.target.value })} />
              </div>
              <select className="input" value={r.status} onChange={(e) => update(r.id, { status: e.target.value as CalendarEntry["status"] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{locale === "pt" ? STATUS_LABEL[s].pt : STATUS_LABEL[s].en}</option>)}
              </select>
              <button type="button" aria-label="Delete" className="btn-ghost !p-2" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></button>
            </div>
            {r.format && <p className="mt-1 text-xs text-muted">{r.format}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
