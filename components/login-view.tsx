"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Gauge, Hexagon, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "شماره موبایل یا ایمیل را وارد کنید."),
  password: z.string().min(8, "رمز عبور باید دست‌کم ۸ نویسه باشد."),
});

type LoginValues = z.infer<typeof loginSchema>;

const digitMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit]);
}

function normalizePhone(value: string) {
  const normalized = normalizeDigits(value).replace(/[^\d+]/g, "");
  if (normalized.startsWith("09")) return `+98${normalized.slice(1)}`;
  if (normalized.startsWith("98")) return `+${normalized}`;
  return normalized;
}

export function LoginView({ setupRequired, initialMessage }: { setupRequired: boolean; initialMessage: string | null }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(
    setupRequired ? "اتصال امن سامانه هنوز پیکربندی نشده است." : initialMessage,
  );
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function submit(values: LoginValues) {
    setFormMessage(null);
    if (setupRequired) {
      setFormMessage("ابتدا تنظیمات اتصال Supabase را در محیط اجرا وارد کنید.");
      return;
    }

    const supabase = createClient();
    const identifier = normalizeDigits(values.identifier.trim());
    const credentials = identifier.includes("@")
      ? { email: identifier.toLowerCase(), password: values.password }
      : { phone: normalizePhone(identifier), password: values.password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error || !data.user) {
      setFormMessage("اطلاعات ورود درست نیست یا حساب شما در دسترس نیست.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut();
      setFormMessage("حساب شما فعال نیست. با مدیر سیستم تماس بگیرید.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-page">
      <div className="login-ambient ambient-one" /><div className="login-ambient ambient-two" />
      <section className="login-visual" aria-label="نمای عملیات فارم">
        <div className="login-brand"><span className="brand-mark"><Hexagon /><i /></span><div><strong>مدار</strong><small>مرکز عملیات فارم</small></div></div>
        <div className="visual-copy"><span>سامانه یکپارچه عملیات</span><h1>هر شیفت،<br />روشن و قابل پیگیری.</h1><p>از گزارش روزانه تا تعمیر و نگهداری؛ همه‌چیز در یک جریان منظم و دقیق.</p></div>
        <div className="operation-orbit">
          <div className="orbit-line orbit-line-one" /><div className="orbit-line orbit-line-two" />
          <div className="core"><Hexagon /><i /></div>
          <span className="orbit-node node-one"><Gauge /></span><span className="orbit-node node-two"><ShieldCheck /></span><span className="orbit-node node-three"><span>۲۴/۷</span></span>
        </div>
        <div className="visual-foot"><span><i /> سامانه آماده به کار</span><small>نسخه ۱.۰ · محیط عملیاتی</small></div>
      </section>

      <section className="login-panel">
        <div className="mobile-login-brand"><span className="brand-mark"><Hexagon /><i /></span><div><strong>مدار</strong><small>مرکز عملیات فارم</small></div></div>
        <div className="login-form-wrap">
          <div className="login-heading"><span className="login-kicker">ورود امن کارکنان</span><h2>ورود به سامانه مدیریت فارم</h2><p>برای ادامه، اطلاعات حساب سازمانی خود را وارد کنید.</p></div>
          <form onSubmit={handleSubmit(submit)} className="login-form" noValidate autoComplete="off">
            <label className="field"><span className="field-label">شماره موبایل یا ایمیل</span><span className="login-input-wrap"><input className="input" inputMode="email" autoComplete="off" placeholder="شماره موبایل یا ایمیل خود را وارد کنید" aria-invalid={Boolean(errors.identifier)} {...register("identifier")} /><UserRound /></span>{errors.identifier && <small className="field-error">{errors.identifier.message}</small>}</label>
            <label className="field"><span className="field-label">رمز عبور <button type="button" onClick={() => setFormMessage("برای بازیابی رمز عبور با مدیر سیستم تماس بگیرید.")}>فراموش کرده‌اید؟</button></span><span className="login-input-wrap"><input className="input" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="رمز عبور" aria-invalid={Boolean(errors.password)} {...register("password")} /><LockKeyhole /><button className="password-toggle" type="button" aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</button></span>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
            {formMessage && <p className="login-message" role="alert">{formMessage}</p>}
            <button className={`button button-primary login-submit ${isSubmitting ? "loading" : ""}`} disabled={isSubmitting || setupRequired}>{isSubmitting ? <><span className="button-spinner" /> در حال ورود...</> : <>ورود به سامانه <ArrowLeft /></>}</button>
          </form>
          <div className="login-help"><ShieldCheck /><p><strong>دسترسی شما محافظت می‌شود</strong><span>در صورت بروز مشکل با مدیر سیستم تماس بگیرید.</span></p></div>
        </div>
        <footer><span>© مدار عملیات</span><button type="button">راهنمای ورود</button></footer>
      </section>
    </main>
  );
}
