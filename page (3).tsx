import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/Legal";
import { getI18n } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Cookie Policy" };

export default async function CookiesPage() {
  const { locale } = await getI18n();
  if (locale === "pt") {
    return (
      <LegalPage title="Política de Cookies">
        <p>Última atualização: [data].</p>
        <h2>Cookies que usamos</h2>
        <ul>
          <li><strong>Cookies de sessão (Supabase):</strong> mantêm a sessão iniciada. Estritamente necessários.</li>
          <li><strong><code>lang</code> e <code>cur</code>:</strong> guardam o idioma e a moeda de apresentação. Necessários para as preferências que escolheu.</li>
          <li><strong>Armazenamento local <code>theme</code>:</strong> guarda o modo claro ou escuro.</li>
          <li><strong>Cookie de segurança da ligação a redes sociais:</strong> cookie temporário (10 minutos) usado apenas durante o login oficial no TikTok ou Instagram, para impedir pedidos forjados.</li>
          <li><strong>Stripe:</strong> ao ir para o pagamento, o Stripe define cookies próprios nas suas páginas para processar o pagamento em segurança e prevenir fraude.</li>
        </ul>
        <p>Não usamos atualmente cookies de publicidade nem de análise. Se adicionar ferramentas de análise ou marketing, tem de atualizar esta página e obter consentimento quando exigido (por exemplo com um banner) antes de definir esses cookies.</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage title="Cookie Policy">
      <p>Last updated: [date].</p>
      <h2>Cookies we use</h2>
      <ul>
        <li><strong>Session cookies (Supabase):</strong> keep you logged in. Strictly necessary.</li>
        <li><strong><code>lang</code> and <code>cur</code>:</strong> remember your language and display currency. Needed for the preferences you chose.</li>
        <li><strong>Local storage <code>theme</code>:</strong> remembers light or dark mode.</li>
        <li><strong>Social connection security cookie:</strong> a temporary cookie (10 minutes) used only during the official TikTok or Instagram login, to prevent forged requests.</li>
        <li><strong>Stripe:</strong> when you go to checkout, Stripe sets its own cookies on its pages to process the payment securely and prevent fraud.</li>
      </ul>
      <p>We do not currently use advertising or analytics cookies. If you add analytics or marketing tools later, you must update this page and obtain consent where required (for example through a consent banner) before setting those cookies.</p>
    </LegalPage>
  );
}
