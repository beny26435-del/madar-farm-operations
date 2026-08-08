"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Gauge, Hexagon, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("یک ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور باید دست‌کم ۸ نویسه باشد."),
});

type LoginValues = z.infer<typeof loginSchema>;

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
    const { data, error } = await supabase.auth.signInWithPassword({ email: values.email.trim().toLowerCase(), password: values.password });

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
        <div className="visual-copy"><span>سامانه یکپارچه عملیات</span><h1>هر روز،<br />روشن و قابل پیگیری.</h1><p>از گزارش روزانه تا تعمیر و نگهداری؛ همه‌چیز در یک جریان منظم و دقیق.</p></div>
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
            <label className="field"><span className="field-label">ایمیل</span><span className="login-input-wrap"><input className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" placeholder="ایمیل خود را وارد کنید" dir="ltr" aria-invalid={Boolean(errors.email)} {...register("email")} /><UserRound /></span>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
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
