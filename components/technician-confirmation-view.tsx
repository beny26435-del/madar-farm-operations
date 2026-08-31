"use client";

import { AlertTriangle, CheckCircle2, Clock3, HardHat, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Confirmation = { type: "handover" | "return"; expiresAt: string; confirmedAt: string | null; requestedAt: string; expired: boolean; technician_name: string; item_name: string; customer_name: string; quantity: number };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TechnicianConfirmationView({ token, confirmation }: { token: string; confirmation: Confirmation | null }) {
  const [confirmed, setConfirmed] = useState(Boolean(confirmation?.confirmedAt));
  const [confirmedAt, setConfirmedAt] = useState(confirmation?.confirmedAt ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/technician-confirmations/${token}`, { method: "POST" });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmedAt?: string | null };
      if (!response.ok) { setError(result.message ?? "ثبت تأیید انجام نشد."); return; }
      setConfirmed(true); setConfirmedAt(result.confirmedAt ?? new Date().toISOString());
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setPending(false); }
  }

  if (!confirmation) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><AlertTriangle /></span><h1>لینک معتبر نیست</h1><p>این لینک اشتباه است یا با لینک جدیدی جایگزین شده است.</p></section></main>;
  if (confirmation.expired) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><Clock3 /></span><h1>اعتبار لینک تمام شده است</h1><p>برای دریافت لینک جدید با مجموعه تماس بگیرید.</p></section></main>;

  const isReturn = confirmation.type === "return";
  return <main className="confirmation-public-page"><section className="confirmation-public-card technician-confirmation-card">
    <header><div className="confirmation-brand"><span><ShieldCheck /></span><div><strong>MinePlus</strong><small>تأیید امن تعمیرکار</small></div></div><span className="confirmation-kind">{isReturn ? <RotateCcw /> : <HardHat />}{isReturn ? "بازگشت به مجموعه" : "تحویل به تعمیرکار"}</span></header>
    {confirmed ? <div className="confirmation-success"><span><CheckCircle2 /></span><h1>تأیید شما ثبت شد</h1><p>{isReturn ? "تحویل دادن دستگاه به مجموعه تأیید شد." : "تحویل گرفتن دستگاه برای تعمیر تأیید شد."}</p>{confirmedAt && <time>{formatDate(confirmedAt)}</time>}</div> : <><div className="confirmation-copy"><small>{confirmation.technician_name}</small><h1>{isReturn ? "آیا این دستگاه را به مجموعه تحویل داده‌اید؟" : "آیا این دستگاه را برای تعمیر تحویل گرفته‌اید؟"}</h1><p>مشخصات زیر را بررسی کنید و فقط در صورت درست بودن، تأیید را بزنید.</p></div><div className="confirmation-items"><article className="confirmation-item"><span><PackageCheck /></span><div><small>دستگاه مشتری {confirmation.customer_name}</small><strong>{confirmation.item_name}</strong><p>{confirmation.quantity.toLocaleString("fa-IR")} عدد</p></div></article></div><div className="confirmation-meta"><span>{isReturn ? "زمان درخواست مرجوعی" : "زمان تحویل دستگاه"}</span><strong>{formatDate(confirmation.requestedAt)}</strong></div>{error && <p className="confirmation-error" role="alert">{error}</p>}<button className="button button-primary confirmation-submit" onClick={confirm} disabled={pending}><CheckCircle2 />{pending ? "در حال ثبت..." : isReturn ? "تأیید می‌کنم تحویل دادم" : "تأیید می‌کنم تحویل گرفتم"}</button><p className="confirmation-note"><ShieldCheck /> این لینک مخصوص همین دستگاه است و پس از تأیید دوباره استفاده نمی‌شود.</p></>}
  </section></main>;
}
