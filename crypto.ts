import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for social tokens at rest. Key: TOKEN_ENCRYPTION_KEY = base64 of 32 random bytes.
// Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super("TOKEN_ENCRYPTION_KEY is not configured (base64 of 32 random bytes).");
  }
}

export function encryptionConfigured(): boolean {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  return Boolean(raw && Buffer.from(raw, "base64").length === 32);
}

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, "base64") : null;
  if (!k || k.length !== 32) throw new EncryptionNotConfiguredError();
  return k;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const [v, iv, tag, data] = payload.split(":");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unsupported token format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
