import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, jsonError, logError } from "@/lib/api";

export const runtime = "nodejs";
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function hasMagic(buf: Buffer, type: string) {
  if (type === "image/png") return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
}

export async function POST(req: Request) {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Please choose an image.", 400);
  const ext = TYPES[file.type];
  if (!ext) return jsonError("Use a PNG, JPG or WebP image.", 400);
  if (file.size > 2 * 1024 * 1024) return jsonError("The image must be 2 MB or smaller.", 400);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasMagic(buf, file.type)) return jsonError("That file is not a valid image.", 400);

  const admin = createAdminClient();
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const up = await admin.storage.from("avatars").upload(path, buf, { contentType: file.type, upsert: false });
  if (up.error) {
    await logError("avatar-upload", up.error.message, {}, user.id);
    return jsonError("Could not upload the photo.", 500);
  }
  const url = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return jsonError("Could not save the photo.", 500);

  // Remove older photos (best effort).
  const { data: old } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
  const stale = (old ?? []).map((f) => `${user.id}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await admin.storage.from("avatars").remove(stale);
  return NextResponse.json({ avatar_url: url });
}

export async function DELETE() {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  const admin = createAdminClient();
  const { data: old } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
  if (old?.length) await admin.storage.from("avatars").remove(old.map((f) => `${user.id}/${f.name}`));
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
