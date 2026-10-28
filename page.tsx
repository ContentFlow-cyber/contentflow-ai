import Link from "next/link";
import { Calendar, FileText, Hash, Image as ImageIcon, Lightbulb, Mail, PenLine, Video } from "lucide-react";
import { getI18n } from "@/lib/i18n-server";
import { loadCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { CoinPackages, PricingTable } from "@/components/PricingTable";
import { TOOLS, pick } from "@/lib/tool-meta";
import { AnimatedText } from "@/components/ui/AnimatedText";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  caption: PenLine, hashtags: Hash, ideas: Lightbulb, script: Video, titles: PenLine, ad: FileText,
  email: Mail, product: FileText, seo: FileText, repurpose: FileText, blog: FileText, calendar: Calendar, image: ImageIcon, video: Video,
};

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const catalog = await loadCatalog();
  let signedIn = false;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient();
      signedIn = Boolean((await supabase.auth.getUser()).data.user);
    }
  } catch {
    signedIn = false;
  }
  const costOf = (id: string) => catalog.costs.find((c) => c.tool === id);

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ContentFlow AI",
    applicationCategory: "BusinessApplication",
    description: "AI content creation for social media.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-brand/25 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-32 -z-10 h-80 w-80 rounded-full bg-brand2/25 blur-[110px]" />
        <div className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="badge">{t("brand.tagline")}</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl"><AnimatedText text={t("hero.title")} /></h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn-primary">{signedIn ? t("nav.dashboard") : t("nav.start")}</Link>
              <Link href="/pricing" className="btn-secondary">{t("hero.cta2")}</Link>
            </div>
            <p className="mt-3 text-sm text-muted">{t("hero.note")}</p>
          </div>

          {/* Illustrative generator preview. The tool chips are real links; nothing here is real output or data. */}
          <div className="card fx-bob fx-glow border-brand/30">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-cyan shadow-[0_0_10px_rgb(var(--cyan))]" />{locale === "pt" ? "O que queres criar hoje?" : "What do you want to create today?"}</span>
              <span className="badge">{locale === "pt" ? "Pré-visualização" : "Preview"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface2/60 px-4 py-3 text-sm text-muted">
              <span>{locale === "pt" ? "Ex.: uma legenda para o lançamento da minha coleção…" : "E.g. a caption for my collection launch…"}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-r from-brand to-brand2 text-white">→</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["caption", "image", "script", "ideas"] as const).map((id) => {
                const meta = TOOLS.find((x) => x.id === id);
                const Icon = ICONS[id] ?? FileText;
                if (!meta) return null;
                return (
                  <Link key={id} href={signedIn ? `/dashboard/tools/${id}` : "/signup"} className="card hover-glow flex flex-col items-center gap-2 !p-3 text-center text-xs font-semibold">
                    <Icon className="h-5 w-5 text-cyan" />
                    {pick(meta.label, locale)}
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted">{t("tool.cost")}: {costOf("caption")?.coins ?? 2} {t("common.coins")} · {t("hero.note")}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container-page scroll-mt-20 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("feat.title")}</h2>
        <p className="mt-3 max-w-2xl text-muted">{t("feat.sub")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = ICONS[tool.id] ?? FileText;
            const cost = costOf(tool.id);
            const pending = tool.kind === "video" || (cost && !cost.enabled);
            return (
              <div key={tool.id} className="card transition hover:border-brand/50">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
                  {pending ? <span className="badge-soon">{t("price.soon")}</span> : <span className="text-xs font-semibold text-muted">{cost?.coins ?? "—"} {t("common.coins")}</span>}
                </div>
                <h3 className="mt-4 font-bold">{pick(tool.label, locale)}</h3>
                <p className="mt-1 text-sm text-muted">{pick(tool.desc, locale)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-page scroll-mt-20 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("how.title")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 font-bold text-white">{n}</span>
              <h3 className="mt-4 font-bold">{t(`how.${n}`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`how.${n}d`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-page scroll-mt-20 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">{t("price.title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("price.sub")}</p>
        <div className="mt-10">
          <PricingTable plans={catalog.plans} signedIn={signedIn} />
        </div>
      </section>

      {/* Coins */}
      <section className="container-page py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">{t("coins.title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("coins.sub")}</p>
        <h3 className="mb-4 mt-10 text-center font-bold">{t("packs.title")}</h3>
        <CoinPackages packages={catalog.packages} signedIn={signedIn} />
      </section>

      {/* FAQ */}
      <section id="faq" className="container-page max-w-3xl scroll-mt-20 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("faq.title")}</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card group">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-brand2 p-10 text-center text-white">
          <h2 className="text-3xl font-extrabold">{t("cta.title")}</h2>
          <Link href="/signup" className="btn mt-6 bg-white text-brand hover:bg-white/90">{t("cta.btn")}</Link>
        </div>
      </section>
    </>
  );
}
