"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronDown, Clipboard, ContactRound, ImagePlus, PackagePlus, Plus, Send, Trash2, Wrench, X } from "lucide-react";
import { useState } from "react";
import { prepareImageForUpload } from "@/lib/images/prepare-upload";

type Customer = { id: string; full_name: string; phone: string | null };
type ItemInput = { key: number; itemName: string; quantity: string; photo: File | null; previewUrl: string | null };
type SavedIntake = { customerId: string; confirmationUrl: string | null; message: string };

export function MaintenanceIntakeForm({ customers, canViewCustomers }: { customers: Customer[]; canViewCustomers: boolean }) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<ItemInput[]>([{ key: 1, itemName: "", quantity: "", photo: null, previewUrl: null }]);
  const [nextKey, setNextKey] = useState(2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedIntake | null>(null);
  const [copied, setCopied] = useState(false);

  function updateItem(key: number, field: "itemName" | "quantity", value: string) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
    setError(null);
  }

  function addItem() {
    setItems((current) => [...current, { key: nextKey, itemName: "", quantity: "", photo: null, previewUrl: null }]);
    setNextKey((value) => value + 1);
  }

  function removeItem(key: number) {
    if (items.length === 1) return;
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function updatePhoto(key: number, photo: File | null) {
    if (!photo) {
      setItems((current) => current.map((item) => item.key === key ? { ...item, photo: null, previewUrl: null } : item));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(photo.type) || photo.size > 20 * 1024 * 1024) {
      setError("عکس دستگاه باید JPG، PNG، WEBP یا HEIC باشد.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setItems((current) => current.map((item) => item.key === key ? { ...item, photo, previewUrl: typeof reader.result === "string" ? reader.result : null } : item));
    reader.readAsDataURL(photo);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (customerMode === "existing" && !customerId) { setError("مشتری را انتخاب کنید."); return; }
    if (customerMode === "new" && fullName.trim().length < 2) { setError("نام مشتری را کامل وارد کنید."); return; }
    const normalizedItems = items.map((item) => ({ itemName: item.itemName.trim(), quantity: Number(item.quantity.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))) }));
    if (normalizedItems.some((item) => item.itemName.length < 2)) { setError("نام همه وسایل را کامل وارد کنید."); return; }
    if (normalizedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) { setError("تعداد هر وسیله را درست وارد کنید."); return; }
    setPending(true); setError(null);
    try {
      const photoCount = items.filter((item) => item.photo).length;
      const targetBytes = photoCount ? Math.min(900_000, Math.floor(3_400_000 / photoCount)) : 900_000;
      const preparedPhotos = await Promise.all(items.map((item) => item.photo ? prepareImageForUpload(item.photo, targetBytes) : null));
      const payload = new FormData();
      payload.append("intake", JSON.stringify({ customerId: customerMode === "existing" ? customerId : null, newCustomer: customerMode === "new" ? { fullName, phone } : null, items: normalizedItems }));
      preparedPhotos.forEach((photo, index) => { if (photo) payload.append(`device-photo-${index}`, photo); });
      const response = await fetch("/api/maintenance-intakes", { method: "POST", body: payload });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as SavedIntake & { message?: string };
      if (!response.ok) { setError(result.message ?? "ثبت تعمیرات انجام نشد."); return; }
      setSaved({ customerId: result.customerId, confirmationUrl: result.confirmationUrl, message: result.message ?? "تعمیرات ثبت شد." });
    } catch (reason) {
      setError(reason instanceof Error && reason.message.startsWith("image_") ? "آماده‌سازی عکس انجام نشد؛ تصویر دیگری انتخاب کنید." : "ارتباط با سامانه برقرار نشد.");
    } finally { setPending(false); }
  }

  async function copyLink() {
    if (!saved?.confirmationUrl) return;
    await navigator.clipboard.writeText(saved.confirmationUrl);
    setCopied(true);
  }

  async function shareLink() {
    if (!saved?.confirmationUrl) return;
    if (!navigator.share) { await copyLink(); return; }
    try { await navigator.share({ title: "تأیید تحویل برای تعمیر", text: "لطفاً وسایلی را که برای تعمیر تحویل داده‌اید تأیید کنید.", url: saved.confirmationUrl }); }
    catch (shareError) { if (shareError instanceof DOMException && shareError.name === "AbortError") return; await copyLink(); }
  }

  if (saved) return <div className="app-page maintenance-intake-page"><div className="page-container"><section className="surface intake-completion">
    <span><CheckCircle2 /></span><h1>تعمیرات ثبت شد</h1><p>{saved.message}</p>
    {saved.confirmationUrl && <div className="intake-share"><div dir="ltr">{saved.confirmationUrl}</div><button className="button button-secondary" onClick={copyLink}><Clipboard />{copied ? "کپی شد" : "کپی لینک"}</button><button className="button button-primary" onClick={shareLink}><Send />ارسال برای مشتری</button></div>}
    <footer><Link className="button button-secondary" href="/maintenance">مشاهده تعمیرات</Link>{canViewCustomers && <Link className="button button-secondary" href={`/customers/${saved.customerId}`}>پرونده مشتری</Link>}<button className="button button-primary" onClick={() => window.location.reload()}><Plus />ثبت جدید</button></footer>
  </section></div></div>;

  return <div className="app-page maintenance-intake-page"><div className="page-container">
    <div className="page-heading intake-page-heading"><div><span className="eyebrow"><Wrench /> پذیرش تعمیرات</span><h1>ثبت تعمیرات</h1><p>مشتری و وسایلی را که از او تحویل گرفته‌اید ثبت کنید.</p></div><Link className="button button-secondary" href="/maintenance">بازگشت به تعمیرات</Link></div>
    <form className="intake-form" onSubmit={submit} noValidate>
      <section className="surface intake-section"><header><span><ContactRound /></span><div><h2>مشتری</h2><p>یک مشتری را انتخاب کنید یا مشتری جدید بسازید.</p></div></header><div className="intake-section-body">
        <div className="segmented-control" role="group" aria-label="روش انتخاب مشتری"><button type="button" className={customerMode === "existing" ? "active" : ""} onClick={() => { setCustomerMode("existing"); setError(null); }} disabled={!customers.length}>انتخاب مشتری</button><button type="button" className={customerMode === "new" ? "active" : ""} onClick={() => { setCustomerMode("new"); setError(null); }}>مشتری جدید</button></div>
        {customerMode === "existing" ? <label className="field"><span className="field-label">مشتری</span><span className="input-wrap"><select className="select" autoComplete="off" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setError(null); }}><option value="">مشتری را انتخاب کنید</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.full_name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}</select><ChevronDown className="input-icon" /></span></label> : <div className="new-customer-fields"><label className="field"><span className="field-label">نام مشتری</span><input className="input" autoComplete="off" value={fullName} onChange={(event) => { setFullName(event.target.value); setError(null); }} /></label><label className="field"><span className="field-label">شماره تماس <span className="field-hint">اختیاری</span></span><input className="input" inputMode="tel" autoComplete="off" dir="ltr" value={phone} onChange={(event) => { setPhone(event.target.value); setError(null); }} /></label></div>}
      </div></section>
      <section className="surface intake-section"><header><span><PackagePlus /></span><div><h2>وسایل تحویل‌گرفته‌شده</h2><p>نام و تعداد هر وسیله را وارد کنید.</p></div><button className="button button-secondary" type="button" onClick={addItem}><Plus />افزودن وسیله</button></header><div className="intake-items">
        {items.map((item, index) => <article className="intake-item-row" key={item.key}><span className="intake-item-number">{(index + 1).toLocaleString("fa-IR")}</span><label className="field"><span className="field-label">نام وسیله</span><input className="input" autoComplete="off" value={item.itemName} onChange={(event) => updateItem(item.key, "itemName", event.target.value)} /></label><label className="field quantity-field"><span className="field-label">تعداد</span><input className="input" inputMode="numeric" autoComplete="off" dir="ltr" value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value.replace(/[^0-9۰-۹]/g, ""))} /></label><button className="remove-intake-item" type="button" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label="حذف وسیله"><Trash2 /></button><div className="device-photo-field">{item.previewUrl ? <div className="device-photo-preview"><Image src={item.previewUrl} alt="پیش‌نمایش عکس دستگاه" width={58} height={58} unoptimized /><div><strong>{item.photo?.name}</strong><small>عکس برای بارگذاری آماده است</small></div><button type="button" onClick={() => updatePhoto(item.key, null)} aria-label="حذف عکس"><X /></button></div> : <label className="device-photo-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => updatePhoto(item.key, event.target.files?.[0] ?? null)} /><ImagePlus /><span><strong>افزودن عکس دستگاه</strong><small>اختیاری · پیش از ارسال بهینه می‌شود</small></span></label>}</div></article>)}
        <button className="add-intake-item" type="button" onClick={addItem}><Plus />افزودن وسیله دیگر</button>
      </div></section>
      {error && <p className="intake-form-error" role="alert">{error}</p>}
      <footer className="intake-form-actions"><Link className="button button-secondary" href="/maintenance">انصراف</Link><button className="button button-primary" disabled={pending}><CheckCircle2 />{pending ? "در حال ثبت..." : "ثبت تعمیرات و ساخت لینک تأیید"}</button></footer>
    </form>
  </div></div>;
}
