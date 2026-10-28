// Official OAuth connections (TikTok, Instagram). Server-only: reads secrets and handles tokens.
// NOTE: endpoints and field names follow each platform's public documentation as known at build time.
// They have NOT been exercised against the live APIs (that needs approved developer apps), so
// platform changes may require small adjustments. Nothing here ever fabricates a metric:
// anything the platform does not return stays null.

export type Provider = "tiktok" | "instagram";
export const PROVIDERS: Provider[] = ["tiktok", "instagram"];
export const isProvider = (s: string): s is Provider => (PROVIDERS as string[]).includes(s);

export const PROVIDER_ENV: Record<Provider, [string, string]> = {
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  instagram: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
};

const SCOPES: Record<Provider, string> = {
  tiktok: "user.info.basic,video.list",
  instagram: "instagram_business_basic,instagram_business_manage_insights",
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
export const redirectUri = (p: Provider) => `${siteUrl()}/api/social/${p}/callback`;

export function credentials(p: Provider): { id: string; secret: string } | null {
  const [a, b] = PROVIDER_ENV[p];
  const id = process.env[a];
  const secret = process.env[b];
  return id && secret ? { id, secret } : null;
}
export const missingEnv = (p: Provider) => PROVIDER_ENV[p].filter((k) => !process.env[k]);

export interface Tokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  refreshExpiresIn?: number | null;
  accountId?: string | null;
  scopes?: string | null;
}
export interface NormalizedPost {
  external_id: string;
  title: string;
  format: string;
  published_at: string; // YYYY-MM-DD
  url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
}

export class PlatformError extends Error {
  constructor(message: string, public auth = false) {
    super(message);
  }
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const day = (d: Date) => d.toISOString().slice(0, 10);

async function call(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = body.error as { message?: string; code?: string } | string | undefined;
    const msg = typeof err === "string" ? err : err?.message || (body.error_description as string) || `HTTP ${res.status}`;
    throw new PlatformError(String(msg).slice(0, 300), res.status === 401 || res.status === 403);
  }
  return body;
}
const form = (o: Record<string, string>) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(o).toString(),
});

export function authorizeUrl(p: Provider, state: string): string {
  const c = credentials(p);
  if (!c) throw new Error("not configured");
  if (p === "tiktok") {
    const q = new URLSearchParams({ client_key: c.id, scope: SCOPES.tiktok, response_type: "code", redirect_uri: redirectUri(p), state });
    return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
  }
  const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri(p), response_type: "code", scope: SCOPES.instagram, state });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

export async function exchangeCode(p: Provider, code: string): Promise<Tokens & { username: string | null }> {
  const c = credentials(p);
  if (!c) throw new Error("not configured");
  if (p === "tiktok") {
    const r = await call("https://open.tiktokapis.com/v2/oauth/token/", form({
      client_key: c.id, client_secret: c.secret, code, grant_type: "authorization_code", redirect_uri: redirectUri(p),
    }));
    if (typeof r.access_token !== "string") throw new PlatformError("TikTok did not return an access token.");
    let username: string | null = null;
    try {
      const u = await call("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
        headers: { authorization: `Bearer ${r.access_token}` },
      });
      username = ((u.data as { user?: { display_name?: string } } | undefined)?.user?.display_name) ?? null;
    } catch { /* username is cosmetic */ }
    return {
      accessToken: r.access_token,
      refreshToken: typeof r.refresh_token === "string" ? r.refresh_token : null,
      expiresIn: num(r.expires_in), refreshExpiresIn: num(r.refresh_expires_in),
      accountId: typeof r.open_id === "string" ? r.open_id : null,
      scopes: typeof r.scope === "string" ? r.scope : SCOPES.tiktok, username,
    };
  }
  // Instagram: short-lived token, then exchange for a long-lived one.
  const short = await call("https://api.instagram.com/oauth/access_token", form({
    client_id: c.id, client_secret: c.secret, grant_type: "authorization_code", redirect_uri: redirectUri(p), code,
  }));
  if (typeof short.access_token !== "string") throw new PlatformError("Instagram did not return an access token.");
  const lq = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: c.secret, access_token: short.access_token });
  const long = await call(`https://graph.instagram.com/access_token?${lq}`);
  const token = typeof long.access_token === "string" ? long.access_token : short.access_token;
  const me = await call(`https://graph.instagram.com/me?${new URLSearchParams({ fields: "user_id,username", access_token: token })}`);
  return {
    accessToken: token, refreshToken: null, expiresIn: num(long.expires_in), refreshExpiresIn: null,
    accountId: String(me.user_id ?? short.user_id ?? "") || null,
    scopes: SCOPES.instagram, username: typeof me.username === "string" ? me.username : null,
  };
}

/** Refresh an access token. TikTok uses the refresh token; Instagram long-lived tokens refresh themselves. */
export async function refreshTokens(p: Provider, accessToken: string, refreshToken: string | null): Promise<Tokens> {
  const c = credentials(p);
  if (!c) throw new Error("not configured");
  if (p === "tiktok") {
    if (!refreshToken) throw new PlatformError("Session expired. Please reconnect.", true);
    const r = await call("https://open.tiktokapis.com/v2/oauth/token/", form({
      client_key: c.id, client_secret: c.secret, grant_type: "refresh_token", refresh_token: refreshToken,
    }));
    if (typeof r.access_token !== "string") throw new PlatformError("Session expired. Please reconnect.", true);
    return {
      accessToken: r.access_token, refreshToken: typeof r.refresh_token === "string" ? r.refresh_token : refreshToken,
      expiresIn: num(r.expires_in), refreshExpiresIn: num(r.refresh_expires_in),
    };
  }
  const r = await call(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken })}`);
  if (typeof r.access_token !== "string") throw new PlatformError("Session expired. Please reconnect.", true);
  return { accessToken: r.access_token, expiresIn: num(r.expires_in) };
}

export async function revokeToken(p: Provider, accessToken: string): Promise<void> {
  const c = credentials(p);
  if (p === "tiktok" && c) {
    await call("https://open.tiktokapis.com/v2/oauth/revoke/", form({ client_key: c.id, client_secret: c.secret, token: accessToken }));
  }
  // Instagram offers no token-revoke endpoint for this flow: the user removes the app in Instagram settings.
}

export async function fetchPosts(p: Provider, accessToken: string): Promise<NormalizedPost[]> {
  if (p === "tiktok") {
    const fields = "id,title,create_time,share_url,view_count,like_count,comment_count,share_count";
    const r = await call(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ max_count: 20 }),
    });
    const videos = ((r.data as { videos?: Record<string, unknown>[] } | undefined)?.videos) ?? [];
    return videos.flatMap((v) => {
      if (typeof v.id !== "string" || typeof v.create_time !== "number") return [];
      const title = typeof v.title === "string" && v.title.trim() ? v.title.trim().slice(0, 200) : "TikTok video";
      return [{
        external_id: v.id, title, format: "Video", published_at: day(new Date(v.create_time * 1000)),
        url: typeof v.share_url === "string" ? v.share_url : null,
        views: num(v.view_count), likes: num(v.like_count), comments: num(v.comment_count), shares: num(v.share_count),
        saves: null, reach: null,
      }];
    });
  }
  const q = new URLSearchParams({
    fields: "id,caption,media_type,timestamp,permalink,like_count,comments_count", limit: "25", access_token: accessToken,
  });
  const r = await call(`https://graph.instagram.com/me/media?${q}`);
  const items = (r.data as Record<string, unknown>[] | undefined) ?? [];
  const out: NormalizedPost[] = [];
  for (const m of items) {
    if (typeof m.id !== "string" || typeof m.timestamp !== "string") continue;
    const d = new Date(m.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    // Per-media insights. Available metrics depend on the media type; if the call fails the values stay null.
    const ins: Record<string, number | null> = {};
    try {
      const iq = new URLSearchParams({ metric: "views,reach,saved,shares", access_token: accessToken });
      const ir = await call(`https://graph.instagram.com/${m.id}/insights?${iq}`);
      for (const row of (ir.data as { name?: string; values?: { value?: number }[] }[] | undefined) ?? []) {
        if (row.name) ins[row.name] = num(row.values?.[0]?.value);
      }
    } catch { /* leave null */ }
    const caption = typeof m.caption === "string" && m.caption.trim() ? m.caption.trim().replace(/\s+/g, " ").slice(0, 200) : "Instagram post";
    const type = typeof m.media_type === "string" ? m.media_type : "";
    out.push({
      external_id: m.id, title: caption,
      format: type === "VIDEO" ? "Reel/Video" : type === "CAROUSEL_ALBUM" ? "Carousel" : type === "IMAGE" ? "Image" : "",
      published_at: day(d), url: typeof m.permalink === "string" ? m.permalink : null,
      views: ins.views ?? null, likes: num(m.like_count), comments: num(m.comments_count),
      shares: ins.shares ?? null, saves: ins.saved ?? null, reach: ins.reach ?? null,
    });
  }
  return out;
}
