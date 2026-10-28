import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/Legal";
import { getI18n } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "[support email]";

  if (locale === "pt") {
    return (
      <LegalPage title="Política de Privacidade">
        <p>Última atualização: [data]. Responsável pelo tratamento: [Nome da empresa, morada, NIF/registo]. Contacto: {email}.</p>

        <h2>1. Dados que recolhemos</h2>
        <ul>
          <li><strong>Dados da conta:</strong> email, nome, apelido, sexo e data de nascimento (opcionais), foto de perfil (opcional), idioma e moeda.</li>
          <li><strong>Conteúdo que cria:</strong> os textos que escreve e o resultado da IA, para mostrar o histórico, favoritos e calendário.</li>
          <li><strong>Objetivos e resultados:</strong> o objetivo, o tipo de negócio e o público que definir, e os resultados das publicações (introduzidos por si ou importados da rede social que ligar).</li>
          <li><strong>Ligações a redes sociais (opcional):</strong> se ligar TikTok ou Instagram pelo login oficial, guardamos os tokens de acesso <strong>encriptados</strong> e lemos apenas as suas publicações e métricas. Nunca recebemos a sua palavra-passe dessas redes. Pode desligar a qualquer momento em Ligações.</li>
          <li><strong>Utilização e faturação:</strong> saldo e movimentos de moedas, plano e registos de pagamento (valores, datas). Os dados do cartão são tratados pelo Stripe e nunca são guardados por nós.</li>
          <li><strong>Segurança:</strong> se ativar a verificação em dois passos, o Supabase guarda o fator de autenticação; registos técnicos e de segurança necessários ao funcionamento.</li>
        </ul>

        <h2>2. Para que usamos os dados e com que fundamento</h2>
        <ul>
          <li>Prestar o serviço que pediu (execução de contrato).</li>
          <li>Processar pagamentos e cumprir obrigações contabilísticas (contrato e obrigação legal).</li>
          <li>Gerar recomendações a partir dos seus próprios resultados. É uma análise por regras sobre os seus dados; não usamos os seus dados para treinar modelos de IA.</li>
          <li>Proteger o serviço e prevenir abusos (interesses legítimos).</li>
          <li>Dados facultativos (foto, sexo, data de nascimento) são tratados com o seu consentimento, que pode retirar apagando-os no Perfil.</li>
        </ul>

        <h2>3. Subcontratantes</h2>
        <ul>
          <li>Supabase (autenticação, base de dados e ficheiros).</li>
          <li>Stripe (pagamentos e faturas).</li>
          <li>Anthropic (geração de texto) e, se ativado, OpenAI (geração de imagens): os pedidos que submete são enviados a estes fornecedores para produzir o resultado.</li>
          <li>TikTok e Meta/Instagram, apenas se ligar a sua conta.</li>
          <li>Vercel (alojamento).</li>
        </ul>
        <p>[Indique os países onde os dados são tratados e as garantias de transferência em que se baseia, por exemplo Cláusulas Contratuais-Tipo.]</p>

        <h2>4. Conservação</h2>
        <p>Conservamos os dados enquanto a conta estiver ativa. O histórico do plano gratuito é limitado aos itens mais recentes. Os registos de pagamento são conservados conforme exige a lei fiscal. Pode eliminar a conta em qualquer momento no Perfil, o que remove conteúdos, resultados, ligações, foto e moedas.</p>

        <h2>5. Os seus direitos (RGPD)</h2>
        <p>Pode aceder, exportar, retificar e apagar os seus dados, opor-se ao tratamento ou limitá-lo, retirar o consentimento e apresentar queixa à autoridade de proteção de dados (em Portugal, a CNPD). Use <strong>Perfil → Exportar os meus dados</strong> e <strong>Eliminar a minha conta</strong>, ou contacte {email}.</p>

        <h2>6. Não submeta dados sensíveis</h2>
        <p>Não introduza dados pessoais de terceiros nem categorias especiais de dados nos pedidos, a menos que tenha direito a fazê-lo.</p>

        <h2>7. Menores</h2>
        <p>O serviço destina-se a maiores de 16 anos. [Ajuste à idade mínima aplicável no seu país.]</p>

        <h2>8. Alterações</h2>
        <p>Atualizamos esta página quando as nossas práticas mudarem e indicamos a data acima.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Privacy Policy">
      <p>Last updated: [date]. Controller: [Company name, address, registration number]. Contact: {email}.</p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email, name, nickname, gender and birthday (optional), profile photo (optional), language and currency.</li>
        <li><strong>Content you create:</strong> the inputs you submit and the AI output, so we can show your history, favorites and calendar.</li>
        <li><strong>Goals and results:</strong> the goal, business type and audience you set, and the results of your posts (entered by you or imported from a social account you connect).</li>
        <li><strong>Social connections (optional):</strong> if you connect TikTok or Instagram through the official login, we store the access tokens <strong>encrypted</strong> and only read your posts and metrics. We never receive your password for those networks. You can disconnect at any time under Connections.</li>
        <li><strong>Usage and billing data:</strong> coin balance and ledger, plan, payment records (amounts, dates). Card details are handled by Stripe and never stored by us.</li>
        <li><strong>Security:</strong> if you enable two-step verification, Supabase stores the authentication factor; error and security logs needed to run the service.</li>
      </ul>

      <h2>2. Why we use it (legal bases)</h2>
      <ul>
        <li>To provide the service you requested (contract).</li>
        <li>To process payments and keep accounting records (contract and legal obligation).</li>
        <li>To generate recommendations from your own results. This is rule-based analysis of your data; we do not use your data to train AI models.</li>
        <li>To secure the service and prevent abuse (legitimate interests).</li>
        <li>Optional data (photo, gender, birthday) is processed with your consent, which you can withdraw by deleting it in your Profile.</li>
      </ul>

      <h2>3. Processors we use</h2>
      <ul>
        <li>Supabase (authentication, database, file storage).</li>
        <li>Stripe (payments and invoices).</li>
        <li>Anthropic (text generation) and, if enabled, OpenAI (image generation): the prompts you submit are sent to these providers to produce your result.</li>
        <li>TikTok and Meta/Instagram, only if you connect your account.</li>
        <li>Vercel (hosting).</li>
      </ul>
      <p>[List the countries where data is processed and the transfer safeguards you rely on, e.g. Standard Contractual Clauses.]</p>

      <h2>4. Retention</h2>
      <p>We keep your data while your account is active. Free-plan history is limited to the most recent items. Payment records are kept as required by tax law. You can delete your account at any time in your Profile, which removes your content, results, connections, photo and coins.</p>

      <h2>5. Your rights (GDPR)</h2>
      <p>You can access, export, correct and delete your data, object to or restrict processing, withdraw consent, and complain to your data protection authority. Use <strong>Profile → Export my data</strong> and <strong>Delete my account</strong>, or contact {email}.</p>

      <h2>6. Do not submit sensitive data</h2>
      <p>Do not enter personal data about other people or special-category data into prompts unless you have the right to do so.</p>

      <h2>7. Children</h2>
      <p>The service is intended for people aged 16 and over. [Adjust to the minimum age that applies in your country.]</p>

      <h2>8. Changes</h2>
      <p>We will update this page when our practices change and note the date above.</p>
    </LegalPage>
  );
}
