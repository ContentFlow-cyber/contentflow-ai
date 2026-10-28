"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Finding } from "@/lib/insights";

type Status = "accepted" | "rejected" | "skipped";

export function InsightsBoard({
  findings, initialStatus,
}: {
  findings: Finding[];
  initialStatus: Record<string, Status>;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const L = (b: { en: string; pt: string }) => (pt ? b.pt : b.en);
  const [status, setStatus] = useState(initialStatus);
  const [showHidden, setShowHidden] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function answer(id: string, s: Status) {
    setErr(null);
    const prev = status[id];
    setStatus((m) => ({ ...m, [id]: s }));
    const res = await fetch("/api/insights/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ finding_id: id, status: s }),
    });
    if (!res.ok) {
      setStatus((m) => {
        const n = { ...m };
        if (prev) n[id] = prev; else delete n[id];
        return n;
      });
      setErr(pt ? "Não foi possível guardar a sua resposta." : "Could not save your answer.");
    }
  }

  const visible = findings.filter((f) => showHidden || (status[f.id] !== "rejected" && status[f.id] !== "skipped"));
  const hiddenCount = findings.length - findings.filter((f) => status[f.id] !== "rejected" && status[f.id] !== "skipped").length;

  return (
    <div className="space-y-4">
      {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{err}</p>}
      {visible.length === 0 && (
        <p className="card text-sm text-muted">
          {pt ? "Não há mais sugestões para mostrar com os dados atuais. Registe mais resultados para obter novas observações." : "No more suggestions to show with the current data. Log more results to get new observations."}
        </p>
      )}
      {visible.map((f) => {
        const s = status[f.id];
        const href = `/dashboard/tools/${f.generate.tool}?topic=${encodeURIComponent(f.generate.topic)}`;
        return (
          <div key={f.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{L(f.text)}</p>
              <div className="flex gap-1">
                <span className="badge">{pt ? "Confiança" : "Confidence"}: {f.confidence === "medium" ? (pt ? "média" : "medium") : pt ? "baixa" : "low"}</span>
                {s && <span className="badge-soon">{s === "accepted" ? (pt ? "Aceite" : "Accepted") : s === "rejected" ? (pt ? "Não útil" : "Not useful") : pt ? "Ignorada" : "Skipped"}</span>}
              </div>
            </div>
            <div>
              <p className="label">{pt ? "Dados que a sustentam" : "Supporting data"}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                {f.evidence.map((e, i) => <li key={i}>{L(e)}</li>)}
              </ul>
            </div>
            <div>
              <p className="label">{pt ? "Ação sugerida" : "Suggested action"}</p>
              <p className="text-sm">{L(f.action)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={href} className="btn-primary !px-3 !py-2" onClick={() => { if (s !== "accepted") void answer(f.id, "accepted"); }}>
                {pt ? "Gerar conteúdo a partir disto" : "Generate content from this"}
              </Link>
              <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => answer(f.id, "accepted")}>{pt ? "Aceitar" : "Accept"}</button>
              <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => answer(f.id, "rejected")}>{pt ? "Não é útil" : "Not useful"}</button>
              <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => answer(f.id, "skipped")}>{pt ? "Outra sugestão" : "Another suggestion"}</button>
            </div>
          </div>
        );
      })}
      {hiddenCount > 0 && (
        <button type="button" className="btn-ghost text-sm" onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? (pt ? "Esconder ignoradas" : "Hide dismissed") : `${pt ? "Mostrar ignoradas" : "Show dismissed"} (${hiddenCount})`}
        </button>
      )}
    </div>
  );
}
