"use client";

import { Camera, CheckCircle2, KeyRound, LoaderCircle, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { roleLabels } from "@/lib/auth/roles";
import type { Viewer } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";

function avatarPublicUrl(path: string | null) {
  return path ? createClient().storage.from("profile-avatars").getPublicUrl(path).data.publicUrl : null;
}

export function ProfileSettingsView({ viewer, email: initialEmail }: { viewer: Viewer; email: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(avatarPublicUrl(viewer.avatarPath));
  const [avatarPending, setAvatarPending] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [emailPending, setEmailPending] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarPending(true); setMessage(null);
    try {
      const formData = new FormData(); formData.append("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { avatarUrl?: string; message?: string };
      if (!response.ok || !result.avatarUrl) { setMessage({ tone: "error", text: result.message ?? "بارگذاری تصویر انجام نشد." }); return; }
      setAvatarUrl(result.avatarUrl); setMessage({ tone: "success", text: result.message ?? "تصویر پروفایل ذخیره شد." });
    } catch { setMessage({ tone: "error", text: "ارتباط با سامانه برقرار نشد." }); } finally { setAvatarPending(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function updateEmail(event: React.FormEvent) {
    event.preventDefault(); setEmailPending(true); setMessage(null);
    try {
      const { error } = await createClient().auth.updateUser({ email: email.trim() });
      if (error) { setMessage({ tone: "error", text: "تغییر ایمیل انجام نشد. ایمیل را بررسی کنید." }); return; }
      setMessage({ tone: "success", text: "درخواست تغییر ایمیل ثبت شد. در صورت فعال بودن تأیید ایمیل، پیام تأیید را بررسی کنید." });
    } finally { setEmailPending(false); }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault(); setMessage(null);
    if (password.length < 8) { setMessage({ tone: "error", text: "رمز جدید باید حداقل ۸ کاراکتر باشد." }); return; }
    if (password !== passwordConfirm) { setMessage({ tone: "error", text: "تکرار رمز با رمز جدید یکسان نیست." }); return; }
    setPasswordPending(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) { setMessage({ tone: "error", text: "تغییر رمز انجام نشد. دوباره وارد حساب شوید و تلاش کنید." }); return; }
      setPassword(""); setPasswordConfirm(""); setMessage({ tone: "success", text: "رمز عبور با موفقیت تغییر کرد." });
    } finally { setPasswordPending(false); }
  }

  return <div className="app-page profile-page"><div className="profile-container"><div className="page-heading"><div><span className="eyebrow"><UserRound /> حساب کاربری</span><h1>پنل کاربری</h1><p>تصویر، ایمیل و رمز عبور حساب خودتان را مدیریت کنید.</p></div></div>
    {message && <div className={`profile-message ${message.tone}`} role="status">{message.tone === "success" ? <CheckCircle2 /> : <ShieldCheck />}{message.text}</div>}
    <section className="surface profile-identity-card"><div className="profile-avatar-large" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}>{!avatarUrl && viewer.displayName.slice(0, 1)}<button onClick={() => fileRef.current?.click()} disabled={avatarPending} aria-label="تغییر تصویر پروفایل">{avatarPending ? <LoaderCircle className="spinning" /> : <Camera />}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadAvatar(event.target.files?.[0])} /></div><div><small>{roleLabels[viewer.role]}</small><h2>{viewer.displayName}</h2><p>{initialEmail}</p><button className="button button-secondary" onClick={() => fileRef.current?.click()} disabled={avatarPending}><Camera />{avatarPending ? "در حال بارگذاری..." : "انتخاب تصویر"}</button></div></section>
    <div className="profile-settings-grid"><form className="surface profile-setting-card" onSubmit={updateEmail}><header><span><Mail /></span><div><h2>تغییر ایمیل</h2><p>ایمیل ورود به حساب را به‌روزرسانی کنید.</p></div></header><label className="field"><span className="field-label">ایمیل جدید</span><input className="input" type="email" inputMode="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="button button-primary" disabled={emailPending || email.trim() === initialEmail}>{emailPending ? <LoaderCircle className="spinning" /> : <Mail />}{emailPending ? "در حال ثبت..." : "ثبت ایمیل جدید"}</button></form>
      <form className="surface profile-setting-card" onSubmit={updatePassword}><header><span><KeyRound /></span><div><h2>تغییر رمز عبور</h2><p>رمزی امن و حداقل ۸ کاراکتری انتخاب کنید.</p></div></header><label className="field"><span className="field-label">رمز جدید</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label className="field"><span className="field-label">تکرار رمز جدید</span><input className="input" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required /></label><button className="button button-primary" disabled={passwordPending}>{passwordPending ? <LoaderCircle className="spinning" /> : <KeyRound />}{passwordPending ? "در حال تغییر..." : "تغییر رمز عبور"}</button></form></div>
  </div></div>;
}
