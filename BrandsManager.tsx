"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import type { Brand } from "@/lib/types";

export function BrandsManager({ initial, max }: { initial: Brand[]; max: number }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [voice, setVoice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const d = await api("/api/brands", "POST", { name, voice });
    if (d) {
      setRows((r) => [...r, d.brand as Brand]);
      setName("");
      setVoice("");
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {locale === "pt"
          ? `Cada marca guarda uma voz própria que é aplicada às suas criações. O seu plano permite até ${max} marca(s).`
          : `Each brand stores its own voice that is applied to your creations. Your plan allows up to ${max} brand(s).`}
      </p>
      {rows.length < max && (
        <form onSubmit={add} className="card space-y-3">
          <input required className="input" placeholder={locale === "pt" ? "Nome da marca" : "Brand name"} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="input min-h-24" maxLength={1500} placeholder={locale === "pt" ? "Voz da marca: estilo, valores, palavras a usar ou evitar…" : "Brand voice: style, values, words to use or avoid…"} value={voice} onChange={(e) => setVoice(e.target.value)} />
          <button type="submit" className="btn-primary"><Plus className="h-4 w-4" /> {locale === "pt" ? "Adicionar marca" : "Add brand"}</button>
        </form>
      )}
      {msg && <p className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{msg}</p>}
      <div className="space-y-3">
        {rows.map((b) => (
          <div key={b.id} className="card space-y-2">
            <div className="flex items-center justify-between gap-3">
              <input className="input max-w-xs font-semibold" defaultValue={b.name} maxLength={80} onBlur={(e) => e.target.value.trim() && e.target.value !== b.name && api(`/api/brands/${b.id}`, "PATCH", { name: e.target.value.trim() })} />
              <button
                type="button" aria-label="Delete" className="btn-ghost !p-2"
                onClick={async () => {
                  if (!confirm(locale === "pt" ? "Eliminar esta marca?" : "Delete this brand?")) return;
                  if (await api(`/api/brands/${b.id}`, "DELETE")) setRows((r) => r.filter((x) => x.id !== b.id));
                }}
              ><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className="input min-h-20" defaultValue={b.voice} maxLength={1500} onBlur={(e) => e.target.value !== b.voice && api(`/api/brands/${b.id}`, "PATCH", { voice: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}
