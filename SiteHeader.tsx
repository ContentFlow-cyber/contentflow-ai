import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CurrencySwitcher, LanguageSwitcher, ThemeToggle } from "@/components/ui/Switchers";
import { getI18n } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const { t } = await getI18n();
  let signedIn = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      signedIn = false;
    }
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/50 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className="btn-ghost">{t("nav.home")}</Link>
          <Link href="/#features" className="btn-ghost">{t("nav.features")}</Link>
          <Link href="/pricing" className="btn-ghost">{t("nav.pricing")}</Link>
          <Link href="/#faq" className="btn-ghost">{t("nav.faq")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block"><CurrencySwitcher /></span>
          <LanguageSwitcher />
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary">{t("nav.dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">{t("nav.login")}</Link>
              <Link href="/signup" className="btn-primary">{t("nav.start")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
