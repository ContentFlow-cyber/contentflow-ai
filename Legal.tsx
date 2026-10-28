import { getI18n } from "@/lib/i18n-server";

export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { locale } = await getI18n();
  const pt = locale === "pt";
  return (
    <div className="container-page max-w-3xl py-16">
      <h1 className="text-4xl font-extrabold tracking-tight"><span className="text-gradient">{title}</span></h1>
      <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
        {pt ? (
          <><strong>Modelo, não é aconselhamento jurídico.</strong> Este documento é um ponto de partida que tem de ser revisto e completado por um profissional qualificado (incluindo os dados da empresa e a lei aplicável) antes do lançamento.</>
        ) : (
          <><strong>Template, not legal advice.</strong> This document is a starting point that must be reviewed and completed by a qualified professional (including your company details and applicable law) before you launch.</>
        )}
      </p>
      <div className="card mt-8 space-y-4 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text">
        {children}
      </div>
    </div>
  );
}
