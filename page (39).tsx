import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n-server";
import { ResultsManager, type ResultPost } from "@/components/dashboard/ResultsManager";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";
import { summarize } from "@/lib/insights";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage() {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const [posts, gens] = await Promise.all([
    supabase.from("posts").select("*").order("published_at", { ascending: false }).limit(500),
    supabase.from("generations").select("id,title").neq("tool", "image").order("created_at", { ascending: false }).limit(50),
  ]);
  const rows = (posts.data ?? []) as ResultPost[];
  const pt = locale === "pt";

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("side.results")}</h1>
        <p className="mt-1 text-sm text-muted">
          {pt
            ? "Registe como correram as suas publicações, ou ligue uma conta para sincronizar. A origem de cada número (manual ou sincronizado) é sempre indicada."
            : "Log how your posts performed, or connect an account to sync. The source of every number (manual or synced) is always shown."}
        </p>
      </div>
      <PerformancePanel summary={summarize(rows)} locale={locale} />
      <ResultsManager initial={rows} creations={(gens.data ?? []) as { id: string; title: string }[]} />
    </div>
  );
}
