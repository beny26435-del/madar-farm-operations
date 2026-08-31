"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, HardHat, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Confirmation = {
  type: "handover" | "return" | "rework";
  expiresAt: string;
  confirmedAt: string | null;
  requestedAt: string;
  expired: boolean;
  technician_name: string;
  item_name: string;
  customer_name: string;
  quantity: number;
  promised_return_at: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function minimumLocalDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TechnicianConfirmationView({ token, confirmation }: { token: string; confirmation: Confirmation | null }) {
  const [confirmed, setConfirmed] = useState(Boolean(confirmation?.confirmedAt));
  const [confirmedAt, setConfirmedAt] = useState(confirmation?.confirmedAt ?? null);
  const [promisedReturnAt, setPromisedReturnAt] = useState(confirmation?.promised_return_at ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReturn = confirmation?.type === "return";
  const isRework = confirmation?.type === "rework";
  const needsPromisedReturn = Boolean(confirmation && !isReturn);

  async function confirm() {
    let promisedReturnIso: string | null = null;
    if (needsPromisedReturn) {
      const selected = new Date(promisedReturnAt);
      if (!promisedReturnAt || Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
        setError("زمان تحویل دستگاه به مجموعه را برای آینده مشخص کنید.");
        return;
      }
      promisedReturnIso = selected.toISOString();
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/technician-confirmations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promisedReturnAt: promisedReturnIso }),
      });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmedAt?: string | null };
      if (!response.ok) { setError(result.message ?? "ثبت تأیید انجام نشد."); return; }
      setConfirmed(true);
      setConfirmedAt(result.confirmedAt ?? new Date().toISOString());
    } catch {
      setError("ارتباط با سامانه برقرار نشد.");
    } finally {
      setPending(false);
    }
  }

  if (!confirmation) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><AlertTriangle /></span><h1>لینک معتبر نیست</h1><p>این لینک اشتباه است یا با لینک جدیدی جایگزین شده است.</p></section></main>;
  if (confirmation.expired) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><Clock3 /></span><h1>اعتبار لینک تمام شده است</h1><p>برای دریافت لینک جدید با مجموعه تماس بگیرید.</p></section></main>;

  const kindLabel = isReturn ? "تحویل به مجموعه" : isRework ? "مرجوعی به تعمیرکار" : "تحویل به تعمیرکار";
  const question = isReturn ? "آیا این دستگاه را به مجموعه تحویل داده‌اید؟" : isRework ? "آیا این دستگاه خراب را دوباره تحویل گرفته‌اید؟" : "آیا این دستگاه را برای تعمیر تحویل گرفته‌اید؟";
  const successText = isReturn ? "تحویل دادن دستگاه به مجموعه تأیید شد." : isRework ? "تحویل مجدد دستگاه خراب برای تعمیر تأیید شد." : "تحویل گرفتن دستگاه برای تعمیر تأیید شد.";

  return <main className="confirmation-public-page"><section className="confirmation-public-card technician-confirmation-card">
    <header><div className="confirmation-brand"><span><ShieldCheck /></span><div><strong>MinePlus</strong><small>تأیید امن تعمیرکار</small></div></div><span className="confirmation-kind">{isReturn || isRework ? <RotateCcw /> : <HardHat />}{kindLabel}</span></header>
    {confirmed ? <div className="confirmation-success"><span><CheckCircle2 /></span><h1>تأیید شما ثبت شد</h1><p>{successText}</p>{needsPromisedReturn && promisedReturnAt && <div className="confirmation-promised-result"><small>زمان اعلام‌شده برای تحویل به مجموعه</small><strong>{formatDate(promisedReturnAt)}</strong></div>}{confirmedAt && <time>{formatDate(confirmedAt)}</time>}</div> : <>
      <div className="confirmation-copy"><small>{confirmation.technician_name}</small><h1>{question}</h1><p>مشخصات زیر را بررسی کنید و فقط در صورت درست بودن، تأیید را بزنید.</p></div>
      <div className="confirmation-items"><article className="confirmation-item"><span><PackageCheck /></span><div><small>دستگاه مشتری {confirmation.customer_name}</small><strong>{confirmation.item_name}</strong><p>{confirmation.quantity.toLocaleString("fa-IR")} عدد</p></div></article></div>
      {needsPromisedReturn && <label className="confirmation-promised-field"><span><CalendarClock /></span><div><strong>چه زمانی دستگاه را به مجموعه تحویل می‌دهید؟</strong><small>تاریخ و ساعت تقریبی را انتخاب کنید</small><input type="datetime-local" min={minimumLocalDateTime()} value={promisedReturnAt} onChange={(event) => { setPromisedReturnAt(event.target.value); setError(null); }} required /></div></label>}
      <div className="confirmation-meta"><span>زمان ساخت درخواست</span><strong>{formatDate(confirmation.requestedAt)}</strong></div>
      {error && <p className="confirmation-error" role="alert">{error}</p>}
      <button className="button button-primary confirmation-submit" onClick={confirm} disabled={pending}><CheckCircle2 />{pending ? "در حال ثبت..." : isReturn ? "تأیید می‌کنم تحویل دادم" : "ثبت زمان و تأیید تحویل"}</button>
      <p className="confirmation-note"><ShieldCheck /> این لینک مخصوص همین دستگاه است و پس از تأیید دوباره استفاده نمی‌شود.</p>
    </>}
  </section></main>;
}
