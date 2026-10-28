"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Calendar, Coins, CreditCard, FolderHeart, Hash, Image as ImageIcon, LayoutDashboard, Lightbulb, LogOut, Mail,
  Menu, PenLine, UserCircle, Tag, Video, FileText, X, BarChart3, TrendingUp, Link2,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { CurrencySwitcher, LanguageSwitcher, ThemeToggle } from "@/components/ui/Switchers";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { TOOLS, pick } from "@/lib/tool-meta";
import { formatNumber } from "@/lib/format";
import type { PlanId } from "@/lib/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  caption: PenLine, hashtags: Hash, ideas: Lightbulb, script: Video, titles: PenLine, ad: Tag, email: Mail,
  product: FileText, seo: FileText, repurpose: FileText, blog: FileText, calendar: Calendar, image: ImageIcon, video: Video, insights: TrendingUp,
};

export function DashboardShell({
  children, balance, planName, planId, name,
}: {
  children: React.ReactNode;
  balance: number;
  planName: string;
  planId: PlanId;
  name: string;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const link = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-gradient-to-r from-brand/20 to-brand2/10 text-brand shadow-[inset_2px_0_0_rgb(var(--brand))]" : "text-muted hover:bg-surface2 hover:text-text"}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const nav = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {link("/dashboard", t("side.dashboard"), LayoutDashboard)}
      {link("/dashboard/results", t("side.results"), BarChart3)}
      {link("/dashboard/insights", t("side.insights"), TrendingUp)}
      {link("/dashboard/connections", t("side.connections"), Link2)}
      <p className="mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{t("side.tools")}</p>
      {TOOLS.map((tool) => link(`/dashboard/tools/${tool.id}`, pick(tool.label, locale), ICONS[tool.id] ?? FileText))}
      <p className="mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">&nbsp;</p>
      {link("/dashboard/saved", t("side.saved"), FolderHeart)}
      {link("/dashboard/calendar", t("side.calendar"), Calendar)}
      {link("/dashboard/brands", t("side.brands"), Tag)}
      {link("/dashboard/coins", t("side.coins"), Coins)}
      {link("/dashboard/billing", t("side.billing"), CreditCard)}
      {link("/dashboard/settings", t("side.settings"), UserCircle)}
      <button type="button" onClick={logout} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface2 hover:text-text">
        <LogOut className="h-4 w-4" /> {t("side.logout")}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-surface/50 backdrop-blur-xl lg:sticky lg:top-0 lg:block lg:h-screen glass-bar">
        <div className="flex h-16 items-center border-b border-border px-5"><Logo href="/dashboard" /></div>
        <div className="h-[calc(100vh-4rem)]">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-2xl backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Logo href="/dashboard" />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="btn-ghost !p-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="h-[calc(100%-4rem)]">{nav}</div>
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/60 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="btn-ghost !p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted sm:block">{name}</div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard/billing" className="badge hidden sm:inline-flex">{planName}</Link>
            <Link href="/dashboard/coins" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-bold" title={t("dash.balance")}>
              <Coins className="h-4 w-4 text-brand" /> {formatNumber(balance, locale)}
            </Link>
            {planId === "free" && <Link href="/dashboard/billing" className="btn-primary !px-3 !py-1.5 !text-xs">{t("dash.upgrade")}</Link>}
            <span className="hidden sm:block"><CurrencySwitcher /></span>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
