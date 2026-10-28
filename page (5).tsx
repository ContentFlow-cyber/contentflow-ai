import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n-server";
import { loadCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { CoinPackages, PricingTable } from "@/components/PricingTable";
import { formatNumber } from "@/lib/format";
import { TOOL_BY_ID, pick } from "@/lib/tool-meta";

export const metadata: Metadata = {
  title: "Pricing",
  description: "ContentFlow AI plans: Free, Pro and Business. Pay monthly or yearly in EUR or USD, and buy extra coins any time.",
};

export default async function PricingPage() {
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
  return (
    <div className="container-page py-16">
      <h1 className="text-center text-4xl font-extrabold tracking-tight">{t("price.title")}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("price.sub")}</p>
      <div className="mt-10"><PricingTable plans={catalog.plans} signedIn={signedIn} /></div>

      <h2 className="mb-4 mt-20 text-center text-2xl font-bold">{t("packs.title")}</h2>
      <CoinPackages packages={catalog.packages} signedIn={signedIn} />

      <h2 className="mb-4 mt-20 text-center text-2xl font-bold">{t("coins.title")}</h2>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <tbody>
            {catalog.costs.map((c) => {
              const meta = TOOL_BY_ID[c.tool];
              if (!meta) return null;
              return (
                <tr key={c.tool} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{pick(meta.label, locale)}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {c.enabled ? `${formatNumber(c.coins, locale)} ${t("common.coins")}` : <span className="badge-soon">{t("price.soon")}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
