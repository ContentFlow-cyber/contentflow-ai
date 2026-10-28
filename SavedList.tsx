"use client";

import { useMemo, useState } from "react";
import { Copy, CopyPlus, Download, Star, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { TOOL_BY_ID, TOOLS, pick } from "@/lib/tool-meta";
import { formatDateTime } from "@/lib/format";
import type { Generation } from "@/lib/types";

type Row = Generation & { image_url?: string | null };

export function SavedList({
  initial, canFavorite, canExport,
}: {
  initial: Row[];
  canFavorite: boolean;
  canExport: boolean;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[]>(initial);
  const [q, setQ] = useState("");
  const [tool, setTool] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!tool || r.tool === tool) &&
        (!favOnly || r.is_favorite) &&
        (!needle || r.title.toLowerCase().includes(needle) || r.text.toLowerCase().includes(needle)),
    );
  }, [rows, q, tool, favOnly]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? t("common.error"));
      return null;
    }
    setMsg(null);
    return data;
  }

  async function toggleFav(r: Row) {
    const d = await call(`/api/generations/${r.id}`, "PATCH", { is_favorite: !r.is_favorite });
    if (d) setRows((x) => x.map((y) => (y.id === r.id ? { ...y, is_favorite: d.generation.is_favorite } : y)));
  }
  async function saveText(r: Row) {
    const d = await call(`/api/generations/${r.id}`, "PATCH", { text: drafts[r.id] });
    if (d) setRows((x) => x.map((y) => (y.id === r.id ? { ...y, text: d.generation.text } : y)));
  }
  async function remove(r: Row) {
    if (!confirm(locale === "pt" ? "Eliminar esta criação?" : "Delete this item?")) return;
    if (await call(`/api/generations/${r.id}`, "DELETE")) setRows((x) => x.filter((y) => y.id !== r.id));
  }
  async function duplicate(r: Row) {
    const d = await call(`/api/generations/${r.id}`, "POST");
    if (d) setRows((x) => [d.generation as Row, ...x]);
  }
  function exportTxt(r: Row) {
    const blob = new Blob([drafts[r.id] ?? r.text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${r.tool}-${r.created_at.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[14rem]" value={tool} onChange={(e) => setTool(e.target.value)}>
          <option value="">{t("common.all")}</option>
          {TOOLS.filter((x) => x.kind !== "video").map((x) => <option key={x.id} value={x.id}>{pick(x.label, locale)}</option>)}
        </select>
        {canFavorite && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> {t("dash.favorites")}</label>
        )}
      </div>
      {msg && <p className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{msg}</p>}

      {shown.length === 0 && <p className="card text-center text-sm text-muted">{t("dash.none")}</p>}
      <div className="space-y-3">
        {shown.map((r) => {
          const meta = TOOL_BY_ID[r.tool];
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className="card !p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(isOpen ? null : r.id)}>
                  <p className="truncate font-semibold">{r.title || "—"}</p>
                  <p className="text-xs text-muted">{pick(meta?.label ?? { en: r.tool, pt: r.tool }, locale)} · {formatDateTime(r.created_at, locale)} · {r.coins_spent} {t("common.coins")}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {canFavorite && (
                    <button type="button" aria-label="Favorite" className="btn-ghost !p-2" onClick={() => toggleFav(r)}>
                      <Star className={`h-4 w-4 ${r.is_favorite ? "fill-current text-warn" : ""}`} />
                    </button>
                  )}
                  {!r.image_url && <button type="button" aria-label="Duplicate" className="btn-ghost !p-2" onClick={() => duplicate(r)}><CopyPlus className="h-4 w-4" /></button>}
                  <button type="button" aria-label="Delete" className="btn-ghost !p-2" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-3">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.text} className="max-h-96 rounded-xl border border-border" />
                  ) : (
                    <textarea
                      className="input min-h-48 font-mono text-[13px]"
                      value={drafts[r.id] ?? r.text}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {!r.image_url && (
                      <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => navigator.clipboard.writeText(drafts[r.id] ?? r.text)}>
                        <Copy className="h-4 w-4" /> {t("tool.copy")}
                      </button>
                    )}
                    {!r.image_url && drafts[r.id] !== undefined && drafts[r.id] !== r.text && (
                      <button type="button" className="btn-primary !px-3 !py-2" onClick={() => saveText(r)}>{t("tool.save")}</button>
                    )}
                    {!r.image_url && canExport && (
                      <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => exportTxt(r)}><Download className="h-4 w-4" /> {t("tool.export")}</button>
                    )}
                    {r.image_url && <a className="btn-secondary !px-3 !py-2" href={r.image_url} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /> {t("tool.export")}</a>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
