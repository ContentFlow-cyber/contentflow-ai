/** Thrown when a required server-side integration key is missing. Nothing is charged in that case. */
export class NotConfiguredError extends Error {
  constructor(public missing: string, message?: string) {
    super(message ?? `${missing} is not configured.`);
    this.name = "NotConfiguredError";
  }
}

export function isTextAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
export function isImageAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
}

export async function generateText(opts: { system: string; prompt: string; maxTokens: number }): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new NotConfiguredError("ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "claude-sonnet-5-5",
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI provider returned ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

const IMAGE_SIZES: Record<string, string> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
};

/** Returns PNG bytes. Uses the OpenAI Images API (OPENAI_API_KEY). */
export async function generateImage(prompt: string, size: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new NotConfiguredError("OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || "gpt-image-1",
      prompt,
      n: 1,
      size: IMAGE_SIZES[size] ?? "1024x1024",
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Image provider returned ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
    if (!img.ok) throw new Error("Could not download the generated image.");
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("Image provider returned no image.");
}
