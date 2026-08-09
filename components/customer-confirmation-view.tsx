"use client";

import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";

type Confirmation = { type: "intake" | "delivery"; expiresAt: string; confirmedAt: string | null; requestedAt: string; expired: boolean; customerName: string; items: Array<{ name: string; quantity: number }>; receivedAt: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CustomerConfirmationView({ token, confirmation }: { token: string; confirmation: Confirmation | null }) {
  const [confirmed, setConfirmed] = useState(Boolean(confirmation?.confirmedAt));
  const [confirmedAt, setConfirmedAt] = useState(confirmation?.confirmedAt ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/confirmations/${token}`, { method: "POST" });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmedAt?: string | null };
      if (!response.ok) { setError(result.message ?? "ثبت تأیید انجام نشد."); return; }
      setConfirmed(true); setConfirmedAt(result.confirmedAt ?? new Date().toISOString());
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setPending(false); }
  }

  if (!confirmation) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><AlertTriangle /></span><h1>لینک معتبر نیست</h1><p>این لینک اشتباه است یا قبلاً با لینک جدیدی جایگزین شده است.</p></section></main>;
  if (confirmation.expired) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><Clock3 /></span><h1>اعتبار لینک تمام شده است</h1><p>برای دریافت لینک جدید با تعمیرگاه تماس بگیرید.</p></section></main>;

  const isDelivery = confirmation.type === "delivery";
  return <main className="confirmation-public-page"><section className="confirmation-public-card">
    <header><div className="confirmation-brand"><span><ShieldCheck /></span><div><strong>مدار</strong><small>تأیید امن تحویل</small></div></div><span className="confirmation-kind">{isDelivery ? <PackageCheck /> : <Wrench />}{isDelivery ? "تحویل از تعمیرگاه" : "تحویل به تعمیرگاه"}</span></header>
    {confirmed ? <div className="confirmation-success"><span><CheckCircle2 /></span><h1>تأیید شما ثبت شد</h1><p>{isDelivery ? "تحویل گرفتن وسیله از تعمیرگاه تأیید شد." : "تحویل دادن وسایل به تعمیرگاه تأیید شد."}</p>{confirmedAt && <time>{formatDate(confirmedAt)}</time>}</div> : <><div className="confirmation-copy"><small>{confirmation.customerName}</small><h1>{isDelivery ? "آیا این وسیله را تحویل گرفته‌اید؟" : "آیا این وسایل را برای تعمیر تحویل داده‌اید؟"}</h1><p>فهرست زیر را بررسی کنید و فقط در صورت درست بودن، تأیید را بزنید.</p></div><div className="confirmation-items">{confirmation.items.map((item, index) => <article className="confirmation-item" key={`${item.name}-${index}`}><span>{isDelivery ? <PackageCheck /> : <Wrench />}</span><div><small>وسیله یا قطعه</small><strong>{item.name}</strong><p>{item.quantity.toLocaleString("fa-IR")} عدد</p></div></article>)}</div><div className="confirmation-meta"><span>{isDelivery ? "زمان ثبت درخواست تحویل" : "زمان ثبت دریافت"}</span><strong>{formatDate(isDelivery ? confirmation.requestedAt : confirmation.receivedAt)}</strong></div>{error && <p className="confirmation-error" role="alert">{error}</p>}<button className="button button-primary confirmation-submit" onClick={confirm} disabled={pending}><CheckCircle2 />{pending ? "در حال ثبت..." : isDelivery ? "تأیید می‌کنم تحویل گرفتم" : "تأیید می‌کنم تحویل دادم"}</button><p className="confirmation-note"><ShieldCheck /> این لینک مخصوص همین تحویل است و پس از تأیید دوباره استفاده نمی‌شود.</p></>}
  </section></main>;
}
