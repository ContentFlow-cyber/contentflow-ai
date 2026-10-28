"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, Copy, Check } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";

export interface ProfileData {
  userId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  nickname: string;
  gender: string | null;
  birthday: string | null;
  avatarUrl: string | null;
}

const GENDERS: [string, string, string][] = [
  ["female", "Feminino", "Female"],
  ["male", "Masculino", "Male"],
  ["other", "Outro", "Other"],
  ["prefer_not", "Prefiro não dizer", "Prefer not to say"],
];

export function ProfileList({ data }: { data: ProfileData }) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const router = useRouter();
  const [p, setP] = useState(data);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState({ a: "", b: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  const none = pt ? "Por favor, selecione" : "Please select";

  function toggle(key: string, initial = "") {
    setMsg(null);
    setDraft(initial);
    setOpen(open === key ? null : key);
  }

  async function saveField(patch: Record<string, string | null>) {
    setBusy(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return say(false, d.error ?? (pt ? "Não foi possível guardar." : "Could not save."));
    const pr = d.profile;
    setP((x) => ({ ...x, nickname: pr.nickname, fullName: pr.full_name ?? "", gender: pr.gender, birthday: pr.birthday }));
    setOpen(null);
    say(true, pt ? "Guardado." : "Saved.");
    router.refresh();
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return say(false, d.error ?? (pt ? "Não foi possível enviar a foto." : "Could not upload the photo."));
    setP((x) => ({ ...x, avatarUrl: d.avatar_url }));
    say(true, pt ? "Foto atualizada." : "Photo updated.");
    router.refresh();
  }

  async function removePhoto() {
    setBusy(true);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setBusy(false);
    if (res.ok) { setP((x) => ({ ...x, avatarUrl: null })); router.refresh(); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) return say(false, pt ? "Use pelo menos 8 caracteres." : "Use at least 8 characters.");
    if (pw.a !== pw.b) return say(false, pt ? "As palavras-passe não coincidem." : "Passwords do not match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw.a });
    setBusy(false);
    if (error) return say(false, error.message);
    setPw({ a: "", b: "" });
    setOpen(null);
    say(true, pt ? "Palavra-passe atualizada." : "Password updated.");
  }

  async function signOutEverywhere() {
    if (!confirm(pt ? "Terminar sessão em todos os dispositivos?" : "Sign out on all devices?")) return;
    await createClient().auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(p.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be blocked */ }
  }

  const initial = (p.nickname || p.fullName || p.email || "?").trim().charAt(0).toUpperCase();
  const genderLabel = GENDERS.find((g) => g[0] === p.gender);
  const row = "flex w-full items-center justify-between gap-4 px-5 py-4 text-left";
  const val = "min-w-0 truncate text-sm text-muted";

  const editor = (key: string, node: React.ReactNode) =>
    open === key && <div className="border-t border-border bg-surface2/50 px-5 py-4">{node}</div>;
  const saveBar = (onSave: () => void) => (
    <div className="mt-3 flex gap-2">
      <button type="button" className="btn-primary !px-4 !py-2" disabled={busy} onClick={onSave}>{busy ? "…" : pt ? "Guardar" : "Save"}</button>
      <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setOpen(null)}>{pt ? "Cancelar" : "Cancel"}</button>
    </div>
  );

  return (
    <section className="card !p-0 overflow-hidden">
      <div className="divide-y divide-border">
        {/* Photo */}
        <div className={row}>
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand to-brand2 text-2xl font-extrabold text-white" aria-hidden>{initial}</div>
          )}
          <div className="flex items-center gap-3 text-sm">
            {p.avatarUrl && <button type="button" className="text-muted hover:text-danger" disabled={busy} onClick={removePhoto}>{pt ? "Remover" : "Remove"}</button>}
            <button type="button" className="flex items-center gap-1 text-muted hover:text-text" disabled={busy} onClick={() => fileRef.current?.click()}>
              {pt ? "Alterar a foto" : "Change the photo"} <ChevronRight className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }} />
          </div>
        </div>

        {/* Nickname */}
        <div>
          <button type="button" className={row} onClick={() => toggle("nick", p.nickname)}>
            <span>{pt ? "Apelido" : "Nickname"}</span>
            <span className="flex items-center gap-1"><span className={val}>{p.nickname || none}</span><ChevronRight className="h-4 w-4 text-muted" /></span>
          </button>
          {editor("nick", <>
            <input className="input" maxLength={40} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {saveBar(() => saveField({ nickname: draft }))}
          </>)}
        </div>

        {/* Full name */}
        <div>
          <button type="button" className={row} onClick={() => toggle("name", p.fullName)}>
            <span>{pt ? "Nome completo" : "Full name"}</span>
            <span className="flex items-center gap-1"><span className={val}>{p.fullName || none}</span><ChevronRight className="h-4 w-4 text-muted" /></span>
          </button>
          {editor("name", <>
            <input className="input" maxLength={80} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {saveBar(() => saveField({ full_name: draft }))}
          </>)}
        </div>

        {/* User ID */}
        <div className={row}>
          <span>{pt ? "ID do utilizador" : "User ID"}</span>
          <button type="button" className="flex min-w-0 items-center gap-2" onClick={copyId} aria-label="Copy">
            <span className={`${val} max-w-[200px] sm:max-w-none`}>{p.userId}</span>
            {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4 text-muted" />}
          </button>
        </div>

        {/* Gender */}
        <div>
          <button type="button" className={row} onClick={() => toggle("gender", p.gender ?? "")}>
            <span>{pt ? "Sexo" : "Gender"}</span>
            <span className="flex items-center gap-1"><span className={val}>{genderLabel ? (pt ? genderLabel[1] : genderLabel[2]) : none}</span><ChevronRight className="h-4 w-4 text-muted" /></span>
          </button>
          {editor("gender", <>
            <select className="input" value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">{none}</option>
              {GENDERS.map((g) => <option key={g[0]} value={g[0]}>{pt ? g[1] : g[2]}</option>)}
            </select>
            {saveBar(() => saveField({ gender: draft || null }))}
          </>)}
        </div>

        {/* Birthday */}
        <div>
          <button type="button" className={row} onClick={() => toggle("bday", p.birthday ?? "")}>
            <span>{pt ? "Aniversário" : "Birthday"}</span>
            <span className="flex items-center gap-1"><span className={val}>{p.birthday ?? none}</span><ChevronRight className="h-4 w-4 text-muted" /></span>
          </button>
          {editor("bday", <>
            <input type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {saveBar(() => saveField({ birthday: draft || null }))}
          </>)}
        </div>

        {/* Email (read-only) */}
        <div className={row}>
          <span>E-mail</span>
          <span className="flex items-center gap-2">
            <span className={val}>{p.email}</span>
            <span className="badge">{p.emailVerified ? (pt ? "Verificado" : "Verified") : pt ? "Por verificar" : "Unverified"}</span>
          </span>
        </div>

        {/* Password */}
        <div>
          <button type="button" className={row} onClick={() => toggle("pw")}>
            <span>{pt ? "Modificar senha" : "Change password"}</span><ChevronRight className="h-4 w-4 text-muted" />
          </button>
          {editor("pw", (
            <form onSubmit={changePassword} className="space-y-3">
              <input type="password" autoComplete="new-password" className="input" placeholder={pt ? "Nova palavra-passe" : "New password"} value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
              <input type="password" autoComplete="new-password" className="input" placeholder={pt ? "Repetir palavra-passe" : "Repeat password"} value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary !px-4 !py-2" disabled={busy}>{pt ? "Atualizar" : "Update"}</button>
                <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => setOpen(null)}>{pt ? "Cancelar" : "Cancel"}</button>
              </div>
            </form>
          ))}
        </div>

        {/* Account authentication */}
        <div>
          <button type="button" className={row} onClick={() => toggle("auth")}>
            <span>{pt ? "Autenticação de conta" : "Account authentication"}</span><ChevronRight className="h-4 w-4 text-muted" />
          </button>
          {editor("auth", (
            <div className="space-y-3 text-sm">
              <p className="text-muted">{pt ? "Método de início de sessão: email e palavra-passe." : "Sign-in method: email and password."}</p>
              <p className="text-muted">{pt ? "Se perdeu um dispositivo ou suspeita de acesso indevido, termine todas as sessões." : "If you lost a device or suspect unauthorized access, end all sessions."}</p>
              <button type="button" className="btn-secondary !px-4 !py-2" onClick={signOutEverywhere}>{pt ? "Terminar sessão em todos os dispositivos" : "Sign out on all devices"}</button>
            </div>
          ))}
        </div>
      </div>
      {msg && <p role="status" className={`m-4 rounded-lg border p-2 text-sm ${msg.ok ? "border-ok/40 bg-ok/10" : "border-danger/40 bg-danger/10 text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
