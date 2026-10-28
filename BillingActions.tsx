"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export function BillingActions({ hasCustomer, hasSubscription, cancelAtPeriodEnd }: { hasCustomer: boolean; hasSubscription: boolean; cancelAtPeriodEnd: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? t("common.error"));
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {hasCustomer && (
          <button
            type="button" className="btn-secondary" disabled={busy}
            onClick={async () => {
              const d = await post("/api/stripe/portal");
              if (d?.url) window.location.href = d.url;
            }}
          >{t("billing.manage")}</button>
        )}
        {hasSubscription && !cancelAtPeriodEnd && (
          <button
            type="button" className="btn-danger" disabled={busy}
            onClick={async () => {
              if (!confirm(locale === "pt" ? "Cancelar no fim do período pago? Mantém o acesso até lá." : "Cancel at the end of the paid period? You keep access until then.")) return;
              if (await post("/api/stripe/subscription", { action: "cancel" })) router.refresh();
            }}
          >{t("billing.cancel")}</button>
        )}
        {hasSubscription && cancelAtPeriodEnd && (
          <button
            type="button" className="btn-primary" disabled={busy}
            onClick={async () => {
              if (await post("/api/stripe/subscription", { action: "resume" })) router.refresh();
            }}
          >{t("billing.resume")}</button>
        )}
      </div>
      {msg && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{msg}</p>}
    </div>
  );
}
