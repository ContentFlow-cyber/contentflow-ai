import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getI18n } from "@/lib/i18n-server";
import { FxBackground } from "@/components/ui/FxBackground";
import { I18nProvider } from "@/components/I18nProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ContentFlow AI — Create better content. Grow faster.", template: "%s · ContentFlow AI" },
  description:
    "Create scroll-stopping social media content with AI: captions, video scripts, hashtags, ideas, ads, articles and a content calendar, in 15 languages.",
  openGraph: {
    title: "ContentFlow AI",
    description: "Create better content. Grow faster.",
    url: siteUrl,
    siteName: "ContentFlow AI",
    type: "website",
    images: [{ url: "/logo-full.png", width: 1024, height: 1024, alt: "ContentFlow AI" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, currency } = await getI18n();
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <FxBackground />
        <I18nProvider locale={locale} currency={currency}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
