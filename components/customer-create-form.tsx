"use client";

import Link from "next/link";
import { ArrowRight, ContactRound, Phone, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerCreateForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 2) { setError("نام مشتری را کامل وارد کنید."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { id?: string; message?: string };
      if (!response.ok || !result.id) { setError(result.message ?? "ثبت مشتری انجام نشد."); return; }
      router.push(`/customers/${result.id}`);
      router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد."); } finally { setPending(false); }
  }

  return <div className="app-page customer-create-page"><div className="narrow-page-container">
    <Link href="/customers" className="back-link"><ArrowRight /> بازگشت به مشتریان</Link>
    <section className="surface customer-create-card"><header><span><ContactRound /></span><div><h1>افزودن مشتری</h1><p>پس از ثبت، پرونده تعمیرات مشتری آماده می‌شود.</p></div></header>
      <form onSubmit={submit}>
        <label className="field"><span className="field-label">نام مشتری <span className="required-mark">ضروری</span></span><input className="input" autoComplete="off" value={fullName} onChange={(event) => { setFullName(event.target.value); setError(null); }} /></label>
        <label className="field"><span className="field-label">شماره تماس <span className="field-hint">اختیاری</span></span><span className="customer-phone-input"><Phone /><input className="input" inputMode="tel" autoComplete="off" dir="ltr" value={phone} onChange={(event) => { setPhone(event.target.value); setError(null); }} /></span></label>
        {error && <p className="report-form-error" role="alert">{error}</p>}
        <footer><Link href="/customers" className="button button-secondary">انصراف</Link><button className="button button-primary" disabled={pending}><Save /> {pending ? "در حال ثبت..." : "ثبت مشتری"}</button></footer>
      </form>
    </section>
  </div></div>;
}
