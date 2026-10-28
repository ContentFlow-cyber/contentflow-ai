import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/Legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>Last updated: [date]. Provider: [Company name, address, registration number].</p>

      <h2>1. The service</h2>
      <p>ContentFlow AI provides AI-assisted tools to draft and organise content. It does not publish to social networks on your behalf.</p>

      <h2>2. Accounts</h2>
      <p>You are responsible for your account and for keeping your login details secure. You must provide accurate information and be legally able to enter this agreement.</p>

      <h2>3. Coins</h2>
      <ul>
        <li>Each creation costs the number of coins shown before you generate. Coins are deducted for successful creations and returned if a creation fails.</li>
        <li><strong>Plan coins</strong> are granted each monthly cycle and expire at the end of the cycle; they do not roll over.</li>
        <li><strong>Purchased coins</strong> do not expire and are used after plan coins.</li>
        <li>Coins have no cash value and cannot be transferred.</li>
      </ul>

      <h2>4. Subscriptions and payments</h2>
      <p>Paid plans renew automatically each month or year until cancelled. You can cancel at any time in Billing; the plan stays active until the end of the paid period. Prices are shown in the currency charged. Refunds: [state your refund policy and any statutory withdrawal rights for consumers in your market].</p>

      <h2>5. Acceptable use</h2>
      <p>You may not use the service to produce unlawful, deceptive, hateful or infringing content, to generate spam, or to attempt to bypass limits or security.</p>

      <h2>6. AI output</h2>
      <p>Output is generated automatically and may be inaccurate or similar to other outputs. You must review it before use and you are responsible for how you use it. We do not guarantee reach, engagement or sales results.</p>

      <h2>7. Intellectual property</h2>
      <p>You keep the rights you have in your inputs. Subject to applicable law and the AI providers&apos; terms, you may use the output for your own purposes.</p>

      <h2>8. Availability and liability</h2>
      <p>The service is provided &quot;as is&quot;. [Add limitation of liability and governing law appropriate to your jurisdiction.]</p>

      <h2>9. Contact</h2>
      <p>See the Contact page.</p>
    </LegalPage>
  );
}
