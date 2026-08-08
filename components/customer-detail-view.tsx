"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clipboard, ContactRound, Link2, PackageCheck, Plus, Send, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, EmptyState, ErrorState, StatusBadge } from "./ui";

type Customer = { id: string; full_name: string; phone: string | null; created_at: string };
type RepairItem = { id: string; customer_id: string; item_name: string; details: string | null; status: "received" | "delivered"; received_at: string; delivered_at: string | null };
type Confirmation = { id: string; item_id: string; type: "intake" | "delivery"; expires_at: string; confirmed_at: string | null };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function CustomerDetailView({ customer, items, confirmations, loadError }: { customer: Customer; items: RepairItem[]; confirmations: Confirmation[]; loadError: boolean }) {
  const router = useRouter();
  const [itemName, setItemName] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<{ url: string; itemName: string; type: "intake" | "delivery" } | null>(null);
  const [copied, setCopied] = useState(false);
  const activeItems = items.filter((item) => item.status === "received");
  const deliveredItems = items.filter((item) => item.status === "delivered");

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (itemName.trim().length < 2) { setError("نام وسیله یا قطعه را کامل وارد کنید."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/customers/${customer.id}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemName, details }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmationUrl?: string | null };
      if (!response.ok) { setError(result.message ?? "ثبت وسیله انجام نشد."); return; }
      const savedName = itemName.trim();
      setItemName(""); setDetails("");
      if (result.confirmationUrl) setShareLink({ url: result.confirmationUrl, itemName: savedName, type: "intake" });
      router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد."); } finally { setPending(false); }
  }

  async function createConfirmationLink(item: RepairItem, type: "intake" | "delivery") {
    setDeliveringId(item.id); setError(null); setCopied(false);
    try {
      const response = type === "delivery"
        ? await fetch(`/api/customers/${customer.id}/items/${item.id}`, { method: "PATCH" })
        : await fetch(`/api/customers/${customer.id}/items/${item.id}/confirmation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmationUrl?: string };
      if (!response.ok || !result.confirmationUrl) { setError(result.message ?? "ساخت لینک انجام نشد."); return; }
      setShareLink({ url: result.confirmationUrl, itemName: item.item_name, type });
      router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد."); } finally { setDeliveringId(null); }
  }

  async function copyConfirmationLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink.url);
    setCopied(true);
  }

  async function shareConfirmationLink() {
    if (!shareLink) return;
    const text = shareLink.type === "delivery" ? `لطفاً تحویل گرفتن «${shareLink.itemName}» را تأیید کنید.` : `لطفاً تحویل دادن «${shareLink.itemName}» برای تعمیر را تأیید کنید.`;
    if (!navigator.share) { await copyConfirmationLink(); return; }
    try { await navigator.share({ title: "تأیید تحویل", text, url: shareLink.url }); }
    catch (shareError) { if (shareError instanceof DOMException && shareError.name === "AbortError") return; await copyConfirmationLink(); }
  }

  const renderItem = (item: RepairItem) => {
    const intake = confirmations.find((confirmation) => confirmation.item_id === item.id && confirmation.type === "intake");
    const delivery = confirmations.find((confirmation) => confirmation.item_id === item.id && confirmation.type === "delivery");
    const deliveryPending = Boolean(delivery && !delivery.confirmed_at);
    return <article className="repair-item-card" key={item.id}><div className="repair-item-icon">{item.status === "received" ? <Wrench /> : <PackageCheck />}</div><div className="repair-item-copy"><header><strong>{item.item_name}</strong><StatusBadge tone={item.status === "delivered" ? "approved" : deliveryPending ? "pending" : "review"}>{item.status === "delivered" ? "تحویل داده‌شده" : deliveryPending ? "منتظر تأیید تحویل" : "در حال تعمیر"}</StatusBadge></header>{item.details && <p>{item.details}</p>}<div className="repair-item-dates"><span>دریافت: {formatDate(item.received_at)}</span>{item.delivered_at && <span>تحویل: {formatDate(item.delivered_at)}</span>}</div><div className="repair-confirmation-status"><span className={intake?.confirmed_at ? "confirmed" : "waiting"}>{intake?.confirmed_at ? <CheckCircle2 /> : <Link2 />}{intake?.confirmed_at ? "دریافت را مشتری تأیید کرده" : "تأیید دریافت در انتظار است"}</span>{delivery && <span className={delivery.confirmed_at ? "confirmed" : "waiting"}>{delivery.confirmed_at ? <CheckCircle2 /> : <Link2 />}{delivery.confirmed_at ? "تحویل را مشتری تأیید کرده" : "تأیید تحویل در انتظار است"}</span>}</div></div><div className="repair-item-actions">{!intake?.confirmed_at && <button className="button button-secondary" disabled={deliveringId === item.id} onClick={() => createConfirmationLink(item, "intake")}><Link2 /> لینک تأیید دریافت</button>}{item.status === "received" && <button className="button button-primary repair-deliver-button" disabled={deliveringId === item.id} onClick={() => createConfirmationLink(item, "delivery")}><Send /> {deliveringId === item.id ? "در حال ساخت..." : deliveryPending ? "ارسال دوباره لینک تحویل" : "ساخت لینک تحویل"}</button>}</div></article>;
  };

  return <div className="app-page customer-detail-page"><div className="page-container">
    <div className="customer-detail-top"><Link href="/customers" className="back-link"><ArrowRight /> مشتریان</Link></div>
    <section className="customer-profile surface"><div className="customer-profile-main"><span><ContactRound /></span><div><small>پرونده مشتری</small><h1>{customer.full_name}</h1>{customer.phone && <a href={`tel:${customer.phone}`} dir="ltr">{customer.phone}</a>}</div></div><div className="customer-profile-stats"><article><span>در حال تعمیر</span><strong>{activeItems.length.toLocaleString("fa-IR")}</strong></article><article><span>تحویل داده‌شده</span><strong>{deliveredItems.length.toLocaleString("fa-IR")}</strong></article></div></section>
    <div className="customer-detail-layout"><section className="surface repair-intake-card"><header><span><Plus /></span><div><h2>ثبت وسیله یا قطعه</h2><p>مورد تحویل‌گرفته‌شده برای تعمیر را ثبت کنید.</p></div></header><form onSubmit={addItem}><label className="field"><span className="field-label">نام وسیله یا قطعه <span className="required-mark">ضروری</span></span><input className="input" autoComplete="off" value={itemName} onChange={(event) => { setItemName(event.target.value); setError(null); }} /></label><label className="field"><span className="field-label">شرح وضعیت <span className="field-hint">اختیاری</span></span><textarea className="textarea" autoComplete="off" value={details} onChange={(event) => { setDetails(event.target.value); setError(null); }} /></label>{error && <p className="report-form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={pending}><Plus /> {pending ? "در حال ثبت..." : "ثبت برای تعمیر"}</button></form></section>
      <section className="surface repair-history-card"><header><div><h2>سوابق تعمیرات مشتری</h2><p>موارد در حال تعمیر و تحویل‌داده‌شده جدا نمایش داده می‌شوند.</p></div></header>{loadError ? <ErrorState /> : items.length === 0 ? <EmptyState title="هنوز موردی ثبت نشده است" description="نخستین وسیله یا قطعه را از فرم کناری ثبت کنید." /> : <div className="repair-history-groups">{activeItems.length > 0 && <section><h3><Wrench /> در حال تعمیر <span>{activeItems.length.toLocaleString("fa-IR")}</span></h3><div>{activeItems.map(renderItem)}</div></section>}{deliveredItems.length > 0 && <section><h3><PackageCheck /> تحویل داده‌شده <span>{deliveredItems.length.toLocaleString("fa-IR")}</span></h3><div>{deliveredItems.map(renderItem)}</div></section>}</div>}</section>
    </div>
  </div><Dialog open={Boolean(shareLink)} onClose={() => { setShareLink(null); setCopied(false); }} title={shareLink?.type === "delivery" ? "لینک تأیید تحویل" : "لینک تأیید دریافت"} description="این لینک را برای مشتری بفرستید تا مشخصات وسیله را ببیند و تأیید کند." mark={<Link2 />}>{shareLink && <div className="confirmation-share-box"><div dir="ltr">{shareLink.url}</div><button className="button button-secondary" onClick={copyConfirmationLink}><Clipboard />{copied ? "کپی شد" : "کپی لینک"}</button><button className="button button-primary" onClick={shareConfirmationLink}><Send /> ارسال برای مشتری</button></div>}</Dialog></div>;
}
