import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function getAuthedUser(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Enforce two-step verification on API calls too.
    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") return { supabase, user: null };
  }
  return { supabase, user };
}

/** Never throws. Records server-side problems for the admin panel. */
export async function logError(scope: string, message: string, meta: Record<string, unknown> = {}, userId?: string) {
  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({ scope, message: message.slice(0, 1000), meta, user_id: userId ?? null });
  } catch {
    console.error(`[${scope}]`, message);
  }
}

export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Resolves the signed-in user and checks the admin role. Returns an error response otherwise. */
export async function requireAdmin(): Promise<
  { ok: true; user: User; admin: SupabaseClient } | { ok: false; response: NextResponse }
> {
  const { user } = await getAuthedUser();
  if (!user) return { ok: false, response: jsonError("Not signed in.", 401) };
  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, response: jsonError("Server is not configured (SUPABASE_SERVICE_ROLE_KEY).", 503) };
  }
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") return { ok: false, response: jsonError("Forbidden.", 403) };
  return { ok: true, user, admin };
}

export async function audit(
  admin: SupabaseClient,
  actor: string,
  action: string,
  target: string,
  details: Record<string, unknown> = {},
) {
  await admin.from("audit_log").insert({ actor, action, target, details });
}
