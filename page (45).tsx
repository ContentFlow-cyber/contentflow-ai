import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n-server";
import { analyze, type PostRow } from "@/lib/insights";
import { InsightsBoard } from "@/components/dashboard/InsightsBoard";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const { t, locale } = await getI18n();
  const pt = locale === "pt";
  const supabase = await createClient();
  const [posts, fb] = await Promise.all([
    supabase.from("posts").select("*").order("published_at", { ascending: false }).limit(500),
    supabase.from("recommendation_feedback").select("finding_id,status"),
  ]);
  const a = analyze((posts.data ?? []) as PostRow[]);
  const status = Object.fromEntries((fb.data ?? []).map((r: { finding_id: string; status: string }) => [r.finding_id, r.status])) as Record<string, "accepted" | "rejected" | "skipped">;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("side.insights")}</h1>
        <p className="mt-1 text-sm text-muted">
          {pt
            ? "Observações calculadas a partir dos seus próprios resultados. É uma análise baseada em regras sobre os dados que registou; não é um modelo treinado, não aprende sozinho e não prevê resultados com certeza."
            : "Observations calculated from your own results. This is rule-based analysis of the data you logged; it is not a trained model, does not learn on its own and does not predict results with certainty."}
        </p>
      </div>

      <PerformancePanel summary={a.summary} locale={locale} />

      {a.enough && a.findings.length > 0 ? (
        <InsightsBoard findings={a.findings} initialStatus={status} />
      ) : (
        <div className="card space-y-3 text-sm">
          <h2 className="font-bold">{pt ? "Ainda não há dados suficientes" : "Not enough data yet"}</h2>
          <p className="text-muted">{pt ? a.limitation.pt : a.limitation.en}</p>
          <p className="label">{pt ? "Experiências para começar a recolher dados úteis" : "Experiments to start collecting useful data"}</p>
          <ul className="list-disc space-y-1 pl-5">
            {a.experiments.map((e, i) => <li key={i}>{pt ? e.pt : e.en}</li>)}
          </ul>
          <Link href="/dashboard/results" className="btn-primary !inline-flex !px-3 !py-2">{pt ? "Registar resultados" : "Log results"}</Link>
        </div>
      )}

      <div className="card text-sm">
        <h2 className="font-bold">{pt ? "Plano de testes com IA" : "AI test plan"}</h2>
        <p className="mt-1 text-muted">
          {pt
            ? "Peça à IA um plano de 3 experiências baseado apenas nos números acima. Se não houver dados suficientes, não gasta moedas."
            : "Ask the AI for a plan of 3 experiments based only on the numbers above. If there is not enough data, no coins are spent."}
        </p>
        <Link href="/dashboard/tools/insights" className="btn-secondary mt-3 !inline-flex !px-3 !py-2">{pt ? "Abrir plano de testes" : "Open test plan"}</Link>
      </div>
    </div>
  );
}
