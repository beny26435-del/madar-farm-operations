"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(2, "نام کارمند را وارد کنید.").max(120, "نام واردشده بیش از حد طولانی است."),
  email: z.string().trim().email("یک ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور باید دست‌کم ۸ نویسه باشد.").max(128, "رمز عبور بیش از حد طولانی است."),
});

type Values = z.infer<typeof schema>;

export function EmployeeCreateForm() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  async function submit(values: Values) {
    setMessage(null);
    const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string };
    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "ساخت حساب انجام نشد." });
      return;
    }
    reset();
    setMessage({ type: "success", text: result.message ?? "حساب کاربر ساخته شد." });
  }

  return (
    <div className="app-page employee-form-page">
      <div className="narrow-page-container">
        <Link href="/employees" className="back-link"><ArrowRight /> بازگشت به کارکنان</Link>
        <section className="surface employee-form-card employee-form-simple">
          <header><span><UserPlus /></span><div><h1>افزودن کارمند</h1><p>فقط نام، ایمیل و رمز عبور لازم است.</p></div></header>
          <form onSubmit={handleSubmit(submit)} autoComplete="off" noValidate>
            <div className="employee-fields">
              <label className="field"><span className="field-label">نام کارمند</span><span className="field-with-icon"><UserRound /><input className="input" autoComplete="off" placeholder="مثلاً محمد رضایی" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} /></span>{errors.fullName && <small className="field-error">{errors.fullName.message}</small>}</label>
              <label className="field"><span className="field-label">ایمیل ورود</span><span className="field-with-icon"><Mail /><input className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" placeholder="name@company.com" dir="ltr" aria-invalid={Boolean(errors.email)} {...register("email")} /></span>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
              <label className="field"><span className="field-label">رمز عبور</span><span className="field-with-icon password-create-field"><LockKeyhole /><input className="input" type={passwordVisible ? "text" : "password"} autoComplete="new-password" placeholder="حداقل ۸ نویسه" dir="ltr" aria-invalid={Boolean(errors.password)} {...register("password")} /><button type="button" aria-label={passwordVisible ? "مخفی کردن رمز" : "نمایش رمز"} onClick={() => setPasswordVisible((current) => !current)}>{passwordVisible ? <EyeOff /> : <Eye />}</button></span><small className="field-help">این رمز را برای ورود اولیه در اختیار کارمند قرار دهید.</small>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
            </div>
            <div className="employee-access-note"><CheckCircle2 /><div><strong>حساب آمادهٔ ورود ساخته می‌شود</strong><span>کارمند بلافاصله با همین ایمیل و رمز عبور وارد سامانه می‌شود.</span></div></div>
            {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
            <footer><Link href="/employees" className="button button-secondary">انصراف</Link><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? "در حال ساخت حساب..." : <>ساخت کارمند <ArrowLeft /></>}</button></footer>
          </form>
        </section>
      </div>
    </div>
  );
}
