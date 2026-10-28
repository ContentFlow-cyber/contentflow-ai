"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Target } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { GOAL_LABELS, STRATEGY_GOALS, type Strategy, type StrategyGoal } from "@/lib/strategy";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/tool-meta";

export function GoalCard({ initial }: { initial: Strategy | null }) {
  const { locale } = useI18n();
  const router = useRouter();
  const pt = locale === "pt";
  const [editing, setEditing] = useState(!initial?.goal);
  const [goal, setGoal] = useState<StrategyGoal | "">(initial?.goal ?? "");
  const [business, setBusiness] = useState(initial?.business_type ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "instagram");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) {
      setErr(pt ? "Escolha o seu objetivo principal." : "Choose your main objective.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/strategy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal, business_type: business, audience, platform }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? (pt ? "Algo correu mal." : "Something went wrong."));
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing && initial?.goal) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Target className="h-5 w-5" /></span>
          <div>
            <p className="label !mb-0">{pt ? "O seu objetivo" : "Your objective"}</p>
            <p className="font-bold">{pt ? GOAL_LABELS[initial.goal].pt : GOAL_LABELS[initial.goal].en}</p>
            <p className="text-xs text-muted">
              {[initial.business_type, initial.audience, initial.platform ? PLATFORM_LABELS[initial.platform as keyof typeof PLATFORM_LABELS] : ""].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setEditing(true)}>{pt ? "Alterar" : "Change"}</button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="card space-y-4 border-brand/40">
      <div>
        <h2 className="text-lg font-bold">{pt ? "Qual é o seu objetivo principal?" : "What is your main objective?"}</h2>
        <p className="text-sm text-muted">
          {pt ? "Usamos isto para personalizar todas as sugestões. Pode mudar a qualquer momento." : "We use this to personalise every suggestion. You can change it any time."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {STRATEGY_GOALS.map((g) => (
          <label key={g} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition ${goal === g ? "border-brand bg-brand/10" : "border-border hover:bg-surface2"}`}>
            <input type="radio" name="goal" checked={goal === g} onChange={() => setGoal(g)} />
            {pt ? GOAL_LABELS[g].pt : GOAL_LABELS[g].en}
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">{pt ? "Tipo de negócio ou conteúdo" : "Business or content type"}</label>
          <input className="input" maxLength={200} value={business} onChange={(e) => setBusiness(e.target.value)} placeholder={pt ? "ex.: loja de velas artesanais" : "e.g. handmade candle shop"} />
        </div>
        <div>
          <label className="label">{pt ? "Público-alvo" : "Target audience"}</label>
          <input className="input" maxLength={300} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={pt ? "ex.: mulheres 25-40 que gostam de decoração" : "e.g. women 25-40 into home decor"} />
        </div>
        <div>
          <label className="label">{pt ? "Rede social principal" : "Main social network"}</label>
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
        </div>
      </div>
      {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{err}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "…" : pt ? "Guardar objetivo" : "Save objective"}</button>
        {initial?.goal && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>{pt ? "Cancelar" : "Cancel"}</button>}
      </div>
    </form>
  );
}
