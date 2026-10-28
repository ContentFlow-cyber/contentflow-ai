// Client-safe tool metadata (labels, form fields). Prompts live in prompts.ts (server only).
export type Lng = "en" | "pt";
type L = Record<Lng, string>;

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "pt", name: "Português" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "tr", name: "Türkçe" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
] as const;
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [string, ...string[]];

export const TONES = ["professional", "funny", "friendly", "persuasive", "educational", "inspirational"] as const;
export const GOALS = ["engagement", "education", "awareness", "sales"] as const;
export const PLATFORMS = ["instagram", "tiktok", "facebook", "linkedin", "youtube", "x", "all"] as const;
export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube Shorts",
  x: "X / Twitter",
  all: "All / mixed",
};

export const OPTION_LABELS: Record<Lng, Record<string, string>> = {
  en: {
    professional: "Professional", funny: "Funny", friendly: "Friendly", persuasive: "Persuasive",
    educational: "Educational", inspirational: "Inspirational",
    engagement: "Engagement", education: "Education", awareness: "Brand awareness", sales: "Sales",
    short: "Short", medium: "Medium", long: "Long",
    square: "Square (1:1)", portrait: "Portrait", landscape: "Landscape",
  },
  pt: {
    professional: "Profissional", funny: "Divertido", friendly: "Amigável", persuasive: "Persuasivo",
    educational: "Educativo", inspirational: "Inspirador",
    engagement: "Envolvimento", education: "Educação", awareness: "Notoriedade da marca", sales: "Vendas",
    short: "Curto", medium: "Médio", long: "Longo",
    square: "Quadrado (1:1)", portrait: "Vertical", landscape: "Horizontal",
  },
};

export type FieldKey =
  | "topic" | "audience" | "platform" | "language" | "tone" | "goal" | "length"
  | "extra" | "emojis" | "hashtags" | "brand" | "days" | "startDate" | "imageSize";

export interface ToolMeta {
  id: string;
  label: L;
  desc: L;
  kind: "text" | "calendar" | "image" | "video";
  group: "social" | "marketing" | "planning" | "media";
  fields: FieldKey[];
  topicLabel?: L;
  extraLabel?: L;
  requiredExtra?: boolean;
  requiredTopic?: boolean;
}

const topicDefault: L = { en: "What is it about?", pt: "Sobre o que é?" };

export const TOOLS: ToolMeta[] = [
  {
    id: "caption", kind: "text", group: "social",
    label: { en: "Caption Generator", pt: "Gerador de Legendas" },
    desc: { en: "Captions with a hook, call to action and hashtags.", pt: "Legendas com gancho, chamada para ação e hashtags." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "length", "emojis", "hashtags", "brand"],
    topicLabel: topicDefault, requiredTopic: true,
  },
  {
    id: "hashtags", kind: "text", group: "social",
    label: { en: "Hashtag Generator", pt: "Gerador de Hashtags" },
    desc: { en: "Relevant hashtags and keywords, grouped by category.", pt: "Hashtags e palavras-chave relevantes, por categoria." },
    fields: ["topic", "audience", "platform", "language"],
    topicLabel: topicDefault, requiredTopic: true,
  },
  {
    id: "ideas", kind: "text", group: "social",
    label: { en: "Content Ideas", pt: "Ideias de Conteúdo" },
    desc: { en: "Post ideas with title, short description and format.", pt: "Ideias de publicações com título, descrição e formato." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "brand"],
    topicLabel: { en: "Niche or business", pt: "Nicho ou negócio" }, requiredTopic: true,
  },
  {
    id: "script", kind: "text", group: "social",
    label: { en: "Video Script", pt: "Guião de Vídeo" },
    desc: { en: "Scene-by-scene scripts for TikTok, Reels and Shorts.", pt: "Guiões por cenas para TikTok, Reels e Shorts." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "length", "brand"],
    topicLabel: { en: "Video topic", pt: "Tema do vídeo" }, requiredTopic: true,
  },
  {
    id: "titles", kind: "text", group: "social",
    label: { en: "Titles & CTAs", pt: "Títulos e CTAs" },
    desc: { en: "Headline and call-to-action options.", pt: "Opções de títulos e chamadas para ação." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "brand"],
    topicLabel: topicDefault, requiredTopic: true,
  },
  {
    id: "ad", kind: "text", group: "marketing",
    label: { en: "Ad Copy", pt: "Texto Publicitário" },
    desc: { en: "Persuasive ad copy variations.", pt: "Variações de texto publicitário persuasivo." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "length", "extra", "brand"],
    topicLabel: { en: "Product or offer", pt: "Produto ou oferta" },
    extraLabel: { en: "Key benefits (optional)", pt: "Principais benefícios (opcional)" }, requiredTopic: true,
  },
  {
    id: "email", kind: "text", group: "marketing",
    label: { en: "Professional Email", pt: "Email Profissional" },
    desc: { en: "Subject line and email body.", pt: "Assunto e corpo do email." },
    fields: ["topic", "audience", "language", "tone", "length", "extra", "brand"],
    topicLabel: { en: "Purpose of the email", pt: "Objetivo do email" },
    extraLabel: { en: "Context / details (optional)", pt: "Contexto / detalhes (opcional)" }, requiredTopic: true,
  },
  {
    id: "product", kind: "text", group: "marketing",
    label: { en: "Product Description", pt: "Descrição de Produto" },
    desc: { en: "Descriptions that sell, with benefits and features.", pt: "Descrições que vendem, com benefícios e características." },
    fields: ["topic", "audience", "language", "tone", "length", "extra", "brand"],
    topicLabel: { en: "Product name", pt: "Nome do produto" },
    extraLabel: { en: "Features and details", pt: "Características e detalhes" }, requiredTopic: true,
  },
  {
    id: "seo", kind: "text", group: "marketing",
    label: { en: "SEO Content", pt: "Conteúdo SEO" },
    desc: { en: "Meta title, description, keywords and outline.", pt: "Meta título, descrição, palavras-chave e estrutura." },
    fields: ["topic", "audience", "language", "tone", "length", "extra", "brand"],
    topicLabel: { en: "Main keyword or topic", pt: "Palavra-chave ou tema principal" },
    extraLabel: { en: "Notes (optional)", pt: "Notas (opcional)" }, requiredTopic: true,
  },
  {
    id: "repurpose", kind: "text", group: "marketing",
    label: { en: "Repurpose Content", pt: "Reaproveitar Conteúdo" },
    desc: { en: "Turn existing content into new formats.", pt: "Transforme conteúdo existente em novos formatos." },
    fields: ["topic", "extra", "platform", "language", "tone", "length", "brand"],
    topicLabel: { en: "Target format (e.g. LinkedIn post, thread)", pt: "Formato de destino (ex.: post LinkedIn, thread)" },
    extraLabel: { en: "Paste the original content", pt: "Cole o conteúdo original" }, requiredExtra: true,
  },
  {
    id: "blog", kind: "text", group: "marketing",
    label: { en: "Blog Article", pt: "Artigo de Blog" },
    desc: { en: "Structured long-form articles.", pt: "Artigos longos e estruturados." },
    fields: ["topic", "audience", "language", "tone", "length", "extra", "brand"],
    topicLabel: { en: "Article topic", pt: "Tema do artigo" },
    extraLabel: { en: "Keywords to include (optional)", pt: "Palavras-chave a incluir (opcional)" }, requiredTopic: true,
  },
  {
    id: "calendar", kind: "calendar", group: "planning",
    label: { en: "Calendar Planner", pt: "Planeador de Calendário" },
    desc: { en: "A 7 or 30-day content plan you can edit and organise.", pt: "Plano de conteúdos de 7 ou 30 dias, editável." },
    fields: ["topic", "audience", "platform", "language", "tone", "goal", "days", "startDate", "extra", "brand"],
    topicLabel: { en: "Niche or business", pt: "Nicho ou negócio" },
    extraLabel: { en: "Themes or campaigns (optional)", pt: "Temas ou campanhas (opcional)" }, requiredTopic: true,
  },
  {
    id: "insights", kind: "text", group: "planning",
    label: { en: "Next-Week Test Plan", pt: "Plano de Testes da Próxima Semana" },
    desc: {
      en: "Turns the patterns found in YOUR logged results into 3 experiments to try next week. Needs at least 5 posts with view counts.",
      pt: "Transforma os padrões encontrados nos SEUS resultados registados em 3 experiências para a próxima semana. Requer pelo menos 5 publicações com visualizações.",
    },
    fields: ["extra", "language"],
    extraLabel: { en: "Focus (optional), e.g. “more leads from videos”", pt: "Foco (opcional), ex.: “mais contactos a partir de vídeos”" },
  },
  {
    id: "image", kind: "image", group: "media",
    label: { en: "AI Image", pt: "Imagem com IA" },
    desc: { en: "Generate images and thumbnails from a description.", pt: "Gere imagens e thumbnails a partir de uma descrição." },
    fields: ["topic", "extra", "imageSize"],
    topicLabel: { en: "Describe the image", pt: "Descreva a imagem" },
    extraLabel: { en: "Style (optional)", pt: "Estilo (opcional)" }, requiredTopic: true,
  },
  {
    id: "video", kind: "video", group: "media",
    label: { en: "AI Video", pt: "Vídeo com IA" },
    desc: { en: "Text-to-video. Pending: needs a video provider.", pt: "Texto para vídeo. Pendente: requer um fornecedor de vídeo." },
    fields: [],
  },
];

export const TOOL_BY_ID: Record<string, ToolMeta> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export function pick(l: L, lng: string): string {
  return lng === "pt" ? l.pt : l.en;
}
