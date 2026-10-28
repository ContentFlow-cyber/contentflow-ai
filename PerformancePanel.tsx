import Link from "next/link";
import type { Summary } from "@/lib/insights";

/** Server component. Shows ONLY data that exists: no placeholders, no estimates. */
export function PerformancePanel({ summary, locale }: { summary: Summary; locale: string }) {
  const pt = locale === "pt";
  const fmt = (n: number) => n.toLocaleString(pt ? "pt-PT" : "en-US");

  if (summary.totalPosts === 0) {
    return (
      <div className="card text-sm">
        <h2 className="font-bold">{pt ? "Desempenho dos conteúdos" : "Content performance"}</h2>
        <p className="mt-2 text-muted">
          {pt
            ? "Ainda não há resultados. Registe os resultados das suas publicações ou ligue uma conta para ver aqui o desempenho real. Não mostramos números de exemplo."
            : "No results yet. Log the results of your posts or connect an account to see real performance here. We never show sample numbers."}
        </p>
        <div className="mt-3 flex gap-3">
          <Link href="/dashboard/results" className="btn-primary !px-3 !py-2">{pt ? "Registar resultados" : "Log results"}</Link>
          <Link href="/dashboard/connections" className="btn-secondary !px-3 !py-2">{pt ? "Ligar uma conta" : "Connect an account"}</Link>
        </div>
      </div>
    );
  }

  const cells: [string, number][] = [
    [pt ? "Visualizações" : "Views", summary.totals.views],
    [pt ? "Gostos" : "Likes", summary.totals.likes],
    [pt ? "Comentários" : "Comments", summary.totals.comments],
    [pt ? "Partilhas" : "Shares", summary.totals.shares],
  ];

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{pt ? "Desempenho dos conteúdos" : "Content performance"}</h2>
        <p className="text-xs text-muted">
          {summary.totalPosts} {pt ? "publicações" : "posts"} · {summary.syncedPosts} {pt ? "sincronizadas" : "synced"} · {summary.manualPosts} {pt ? "introduzidas manualmente" : "entered manually"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map(([label, v]) => (
          <div key={label} className="rounded-xl bg-surface2 p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-xl font-extrabold">{fmt(v)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        {pt ? "Soma apenas dos valores registados ou sincronizados; campos em branco não contam como zero." : "Sum of the values that were logged or synced only; blank fields are not counted as zero."}
      </p>
      {summary.topPosts.length > 0 && (
        <div>
          <p className="label">{pt ? "Conteúdos com melhor desempenho (visualizações)" : "Top performing content (views)"}</p>
          <ul className="divide-y divide-border text-sm">
            {summary.topPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {p.platform} · <strong className="text-text">{fmt(p.views ?? 0)}</strong> {pt ? "vis." : "views"} ·{" "}
                  {p.source === "synced" ? (pt ? "sincronizado" : "synced") : "manual"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
