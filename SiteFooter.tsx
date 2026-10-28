import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getI18n } from "@/lib/i18n-server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@your-domain.com";
  return (
    <footer className="mt-24 border-t border-border">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">{t("brand.tagline")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/contact" className="hover:text-text">{t("footer.contact")}</Link>
          <Link href="/privacy" className="hover:text-text">{t("footer.privacy")}</Link>
          <Link href="/terms" className="hover:text-text">{t("footer.terms")}</Link>
          <Link href="/cookies" className="hover:text-text">{t("footer.cookies")}</Link>
          <Link href="/dashboard/billing" className="hover:text-text">{t("footer.cancel")}</Link>
          <a href={`mailto:${support}`} className="hover:text-text">{support}</a>
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} ContentFlow AI. {t("footer.rights")}
      </div>
    </footer>
  );
}
