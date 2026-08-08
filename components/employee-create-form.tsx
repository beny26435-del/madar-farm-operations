"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AppRole } from "@/lib/auth/roles";

const schema = z.object({
  fullName: z.string().trim().min(2, "نام کامل الزامی است."),
  personnelCode: z.string().trim().min(2, "کد پرسنلی الزامی است."),
  email: z.string().trim().email("ایمیل معتبر نیست.").or(z.literal("")),
  mobile: z.string().trim(),
  password: z.string().min(12, "رمز اولیه باید دست‌کم ۱۲ نویسه باشد."),
  role: z.enum(["employee", "manager"]),
}).refine((value) => Boolean(value.email || value.mobile), { message: "ایمیل یا موبایل را وارد کنید.", path: ["email"] });

type Values = z.infer<typeof schema>;

export function EmployeeCreateForm({ actorRole }: { actorRole: AppRole }) {
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
        <section className="surface employee-form-card">
          <header><span><UserPlus /></span><div><h1>ساخت حساب کاربری</h1><p>همه فیلدها خالی هستند و فقط اطلاعات واردشده ذخیره می‌شود.</p></div></header>
          <form onSubmit={handleSubmit(submit)} autoComplete="off" noValidate>
            <div className="form-grid">
              <label className="field"><span className="field-label">نام و نام خانوادگی</span><input className="input" autoComplete="off" placeholder="نام کامل" {...register("fullName")} />{errors.fullName && <small className="field-error">{errors.fullName.message}</small>}</label>
              <label className="field"><span className="field-label">کد پرسنلی</span><input className="input" autoComplete="off" placeholder="کد پرسنلی" {...register("personnelCode")} />{errors.personnelCode && <small className="field-error">{errors.personnelCode.message}</small>}</label>
              <label className="field"><span className="field-label">ایمیل</span><input className="input" type="email" autoComplete="off" placeholder="ایمیل سازمانی" {...register("email")} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
              <label className="field"><span className="field-label">شماره موبایل</span><input className="input" inputMode="tel" autoComplete="off" placeholder="شماره موبایل" {...register("mobile")} /></label>
              <label className="field"><span className="field-label">رمز اولیه</span><input className="input" type="password" autoComplete="new-password" placeholder="حداقل ۱۲ نویسه" {...register("password")} />{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
              <label className="field"><span className="field-label">نقش</span><select className="select" autoComplete="off" {...register("role")}><option value="">انتخاب نقش</option><option value="employee">کارمند</option>{actorRole === "admin" && <option value="manager">مدیر عملیات</option>}</select>{errors.role && <small className="field-error">نقش را انتخاب کنید.</small>}</label>
            </div>
            <div className="form-note"><ShieldCheck /><p><strong>محدودیت نقش فعال است.</strong><span>{actorRole === "admin" ? "مدیر سیستم می‌تواند مدیر عملیات یا کارمند بسازد." : "مدیر عملیات فقط می‌تواند حساب کارمند بسازد."}</span></p></div>
            {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
            <footer><Link href="/employees" className="button button-secondary">انصراف</Link><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? "در حال ساخت..." : <>ساخت حساب <ArrowLeft /></>}</button></footer>
          </form>
        </section>
      </div>
    </div>
  );
}
