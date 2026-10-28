"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { useI18n } from "@/components/I18nProvider";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="btn-ghost !p-2"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch {
          /* storage unavailable */
        }
      }}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useI18n();
  return (
    <select
      aria-label="Language"
      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text"
      value={locale}
      onChange={(e) => {
        setCookie("lang", e.target.value);
        router.refresh();
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}

export function CurrencySwitcher() {
  const router = useRouter();
  const { currency } = useI18n();
  return (
    <select
      aria-label="Currency"
      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text"
      value={currency}
      onChange={(e) => {
        setCookie("cur", e.target.value);
        router.refresh();
      }}
    >
      <option value="eur">EUR €</option>
      <option value="usd">USD $</option>
    </select>
  );
}
