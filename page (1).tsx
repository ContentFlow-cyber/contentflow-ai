import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@your-domain.com";
  return (
    <div className="container-page max-w-2xl py-16">
      <h1 className="text-4xl font-extrabold tracking-tight">Contact & support</h1>
      <p className="mt-4 text-muted">
        Questions about your account, billing or cancellations? Email us and include the email address you signed up with. We will reply as soon as we can.
      </p>
      <a href={`mailto:${email}`} className="card mt-8 flex items-center gap-4 transition hover:border-brand/50">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand"><Mail className="h-5 w-5" /></span>
        <span>
          <span className="block font-bold">{email}</span>
          <span className="text-sm text-muted">Support & billing</span>
        </span>
      </a>
      <p className="mt-6 text-sm text-muted">
        To cancel a subscription, go to <a className="font-semibold text-brand" href="/dashboard/billing">Dashboard → Billing</a>. To export or delete your data, use <a className="font-semibold text-brand" href="/dashboard/settings">Settings</a>.
      </p>
    </div>
  );
}
