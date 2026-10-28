import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { fetchPosts, PlatformError, refreshTokens, type Provider } from "@/lib/social";

export const SYNC_COOLDOWN_MS = 60_000;

const iso = (secs?: number | null) => (secs ? new Date(Date.now() + secs * 1000).toISOString() : null);

export type SyncResult =
  | { ok: true; inserted: number; updated: number }
  | { ok: false; error: string; status: number; needsReconnect?: boolean };

/** Pulls the user's recent posts from the platform and upserts them. Never invents a metric. */
export async function syncProvider(admin: SupabaseClient, userId: string, provider: Provider): Promise<SyncResult> {
  const { data: conn } = await admin.from("social_connections").select("*").eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (!conn) return { ok: false, error: "This account is not connected.", status: 404 };

  if (conn.last_synced_at && Date.now() - new Date(conn.last_synced_at).getTime() < SYNC_COOLDOWN_MS) {
    return { ok: false, error: "Synced a moment ago. Please wait a minute before syncing again.", status: 429 };
  }

  const fail = async (message: string, auth: boolean): Promise<SyncResult> => {
    await admin.from("social_connections").update({ status: auth ? "expired" : "error", last_error: message.slice(0, 300) }).eq("id", conn.id);
    return { ok: false, error: auth ? "The connection expired. Please reconnect your account." : message, status: auth ? 401 : 502, needsReconnect: auth };
  };

  try {
    let access = decryptToken(conn.access_token_enc);
    const refresh = conn.refresh_token_enc ? decryptToken(conn.refresh_token_enc) : null;

    const expiring = conn.expires_at && new Date(conn.expires_at).getTime() - Date.now() < 24 * 3600 * 1000;
    if (expiring) {
      const t = await refreshTokens(provider, access, refresh);
      access = t.accessToken;
      await admin.from("social_connections").update({
        access_token_enc: encryptToken(t.accessToken),
        refresh_token_enc: t.refreshToken ? encryptToken(t.refreshToken) : conn.refresh_token_enc,
        expires_at: iso(t.expiresIn), refresh_expires_at: t.refreshExpiresIn ? iso(t.refreshExpiresIn) : conn.refresh_expires_at,
      }).eq("id", conn.id);
    }

    const posts = await fetchPosts(provider, access);
    const ids = posts.map((p) => p.external_id);
    const { data: existing } = ids.length
      ? await admin.from("posts").select("id,external_id").eq("user_id", userId).eq("platform", provider).in("external_id", ids)
      : { data: [] as { id: string; external_id: string }[] };
    const known = new Map((existing ?? []).map((r: { id: string; external_id: string }) => [r.external_id, r.id]));
    const now = new Date().toISOString();

    let inserted = 0, updated = 0;
    const fresh = posts.filter((p) => !known.has(p.external_id)).map((p) => ({
      user_id: userId, source: "synced", platform: provider, last_synced_at: now, ...p,
    }));
    if (fresh.length) {
      const { error } = await admin.from("posts").insert(fresh);
      if (error) throw new Error("Could not save the synced posts.");
      inserted = fresh.length;
    }
    // Existing rows: only the platform numbers change, so labels the user set (format, topic, objective) are kept.
    for (const p of posts) {
      const id = known.get(p.external_id);
      if (!id) continue;
      const { error } = await admin.from("posts").update({
        views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves, reach: p.reach,
        last_synced_at: now, updated_at: now,
      }).eq("id", id).eq("user_id", userId);
      if (!error) updated++;
    }

    await admin.from("social_connections").update({ status: "connected", last_error: null, last_synced_at: now }).eq("id", conn.id);
    return { ok: true, inserted, updated };
  } catch (e) {
    if (e instanceof PlatformError) return fail(e.message, e.auth);
    return fail(e instanceof Error ? e.message : "Sync failed.", false);
  }
}
