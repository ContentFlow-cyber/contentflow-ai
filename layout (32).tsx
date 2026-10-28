import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui/Switchers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
