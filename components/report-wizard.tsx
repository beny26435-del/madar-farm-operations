"use client";

import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarDays, Camera, Check, CheckCircle2,
  File, FileText, Image as ImageIcon, Paperclip, ShieldCheck, Trash2, Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SelectField } from "./ui";

const dailySteps = ["اطلاعات روز", "فعالیت‌ها", "مشکلات و اقدامات", "تصاویر و توضیحات"];
const maintenanceSteps = ["مشخصات اولیه", "شرح مشکل", "اقدامات انجام‌شده", "قطعات و هزینه", "تصاویر", "نتیجه نهایی"];
const faNumber = (value: number | string) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

function Field({ label, placeholder, type = "text", hint }: { label: string; placeholder?: string; type?: string; hint?: string }) {
  return <label className="field"><span className="field-label">{label}{hint && <span className="field-hint">{hint}</span>}</span><input className="input" type={type} placeholder={placeholder} autoComplete="off" /></label>;
}

function TimeField({ label }: { label: string }) {
  return <label className="field"><span className="field-label">{label}<span className="field-hint">۲۴ ساعته</span></span><input className="input time-text-input" type="text" inputMode="numeric" autoComplete="off" placeholder="مثلاً 08:30" maxLength={5} dir="ltr" /><small className="field-help">ساعت را با قالب 08:30 تایپ کنید.</small></label>;
}

function TextField({ label, placeholder, hint }: { label: string; placeholder: string; hint?: string }) {
  return <label className="field"><span className="field-label">{label}{hint && <span className="field-hint">{hint}</span>}</span><textarea className="textarea" placeholder={placeholder} autoComplete="off" /></label>;
}

function UploadField({ variant = "general" }: { variant?: "general" | "before" | "after" }) {
  const [files, setFiles] = useState<File[]>([]);
  const title = variant === "before" ? "تصاویر قبل از تعمیر" : variant === "after" ? "تصاویر بعد از تعمیر" : "تصاویر گزارش";
  return (
    <div className="upload-field">
      <span className="field-label">{title}<span className="field-hint">حداکثر ۸ تصویر</span></span>
      <label className="upload-drop">
        <input type="file" accept="image/*" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 8))} />
        <span><Camera /></span><div><strong>افزودن تصویر یا فایل</strong><small>دوربین، گالری یا انتخاب فایل · حداکثر ۱۰ مگابایت</small></div>
      </label>
      {files.length > 0 && <div className="upload-previews">{files.map((file, index) => <article key={`${file.name}-${file.lastModified}`}><span className={`attachment-thumb thumb-${index % 3}`}><ImageIcon /></span><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت</small><i><Check /> انتخاب شد</i></div><button type="button" aria-label="حذف تصویر" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><Trash2 /></button></article>)}</div>}
    </div>
  );
}

export function ReportWizard({ type }: { type: "daily" | "maintenance" }) {
  const maintenance = type === "maintenance";
  const steps = maintenance ? maintenanceSteps : dailySteps;
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const progress = `${((step + 1) / steps.length) * 100}%`;
  const cancelHref = maintenance ? "/maintenance" : "/daily-reports";

  const content = useMemo(() => {
    if (!maintenance) {
      if (step === 0) return <><div className="form-intro-icon"><CalendarDays /></div><div className="form-grid"><Field label="نام کارمند" placeholder="نام کارمند را وارد کنید" /><Field label="تاریخ گزارش" type="date" /><div className="time-row form-grid-wide"><TimeField label="ساعت ورود" /><TimeField label="ساعت خروج" /></div></div><div className="form-note"><ShieldCheck /><p><strong>ورود ساعت ساده و دستی است.</strong><span>ساعت شروع و پایان کار را خودتان با قالب ۲۴ ساعته تایپ کنید.</span></p></div></>;
      if (step === 1) return <><div className="form-intro-icon"><FileText /></div><TextField label="فعالیت‌های انجام‌شده" placeholder="فعالیت‌های انجام‌شده را وارد کنید" hint="الزامی" /><div className="writing-tip"><span>پیشنهاد</span> فعالیت‌ها را کوتاه، روشن و به ترتیب انجام بنویسید تا بررسی سریع‌تر شود.</div></>;
      if (step === 2) return <><div className="form-intro-icon"><Wrench /></div><TextField label="مشکلات مشاهده‌شده" placeholder="مشکلات مشاهده‌شده را وارد کنید" /><TextField label="اقدامات انجام‌شده" placeholder="اقدامات انجام‌شده را وارد کنید" /></>;
      return <><div className="form-intro-icon"><ImageIcon /></div><UploadField /><TextField label="توضیحات تکمیلی" placeholder="توضیحات تکمیلی را وارد کنید" hint="اختیاری" /><div className="file-attachment"><Paperclip /><div><strong>فایل پیوست</strong><small>PDF، Word یا Excel تا ۱۰ مگابایت</small></div><label className="button button-secondary">انتخاب فایل<input type="file" hidden /></label></div></>;
    }

    if (step === 0) return <><div className="form-intro-icon"><Wrench /></div><div className="form-grid"><Field label="تاریخ" type="date" /><Field label="ثبت‌کننده" placeholder="نام ثبت‌کننده را وارد کنید" /><Field label="عنوان تعمیر / سرویس" placeholder="عنوان تعمیر یا سرویس را وارد کنید" /><Field label="شناسه یا نام تجهیز" placeholder="شناسه یا نام تجهیز را وارد کنید" /><SelectField label="نوع مشکل"><option value="">انتخاب نوع مشکل</option><option>مکانیکی</option><option>برقی</option><option>شبکه</option><option>سرویس دوره‌ای</option><option>سایر</option></SelectField><SelectField label="وضعیت اولیه"><option value="">انتخاب وضعیت</option><option>ثبت اولیه</option><option>در انتظار بررسی</option><option>در حال انجام</option></SelectField></div></>;
    if (step === 1) return <><div className="form-intro-icon"><FileText /></div><TextField label="شرح کامل مشکل" placeholder="نشانه‌ها، زمان مشاهده و شرایط وقوع مشکل را توضیح دهید" hint="الزامی" /><div className="writing-tip"><span>نکته فنی</span> در صورت وجود کد خطا یا نشانه مشخص، آن را دقیق ثبت کنید.</div></>;
    if (step === 2) return <><div className="form-intro-icon"><Wrench /></div><TextField label="اقدامات انجام‌شده" placeholder="بررسی‌ها و اقدامات انجام‌شده را وارد کنید" hint="الزامی" /><SelectField label="تکنسین / مسئول انجام کار"><option value="">انتخاب تکنسین</option><option>کارمند داخلی</option><option>تکنسین بیرونی</option></SelectField></>;
    if (step === 3) return <><div className="form-intro-icon"><File /></div><TextField label="قطعات مصرف‌شده یا مورد نیاز" placeholder="نام، تعداد و مشخصات قطعه را وارد کنید" /><div className="form-grid"><Field label="هزینه" placeholder="مبلغ را وارد کنید" hint="تومان" /><SelectField label="وضعیت تأمین قطعه"><option value="">انتخاب وضعیت</option><option>نیاز به قطعه</option><option>قطعه موجود است</option><option>خریداری شد</option></SelectField></div></>;
    if (step === 4) return <><div className="form-intro-icon"><Camera /></div><div className="dual-upload"><UploadField variant="before" /><UploadField variant="after" /></div></>;
    return <><div className="form-intro-icon"><CheckCircle2 /></div><SelectField label="وضعیت نهایی"><option value="">انتخاب وضعیت نهایی</option><option>در حال انجام</option><option>نیاز به قطعه</option><option>تکمیل شده</option><option>لغو شده</option></SelectField><TextField label="توضیحات نهایی" placeholder="نتیجه نهایی یا نکات پیگیری را وارد کنید" /><div className="file-attachment"><Paperclip /><div><strong>فایل پیوست</strong><small>فاکتور، دستورالعمل یا گزارش فنی</small></div><label className="button button-secondary">انتخاب فایل<input type="file" hidden /></label></div></>;
  }, [maintenance, step]);

  function next() { if (step < steps.length - 1) setStep(step + 1); else setCompleted(true); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (completed) return <div className="app-page wizard-page"><div className="completion-card surface"><span><Check /></span><strong>فرم تکمیل شد</strong><p>هیچ داده‌ای به‌صورت خودکار وارد یا ارسال نشده است.</p><div><Link className="button button-secondary" href={cancelHref}>بازگشت به فهرست</Link><button className="button button-primary" onClick={() => { setStep(0); setCompleted(false); }}>فرم جدید</button></div></div></div>;

  return (
    <div className="app-page wizard-page">
      <div className="wizard-container">
        <div className="wizard-topline"><Link href={cancelHref} className="back-link"><ArrowRight /> بازگشت</Link></div>
        <div className="wizard-heading"><div><span className="eyebrow">{maintenance ? <><Wrench /> فرم عملیات فنی</> : <><CalendarDays /> فرم گزارش روزانه</>}</span><h1>{maintenance ? "ثبت گزارش تعمیرات" : "گزارش کار روزانه"}</h1><p>اطلاعات را مرحله‌به‌مرحله و بدون مقدار اولیه وارد کنید.</p></div></div>
        <div className="mobile-progress"><div><span>مرحله {faNumber(step + 1)} از {faNumber(steps.length)}</span><strong>{steps[step]}</strong></div><em>{faNumber(Math.round(((step + 1) / steps.length) * 100))}٪</em><span className="progress-track"><i style={{ width: progress }} /></span></div>
        <div className="wizard-layout">
          <aside className="wizard-steps surface">
            <div className="steps-caption"><span>روند تکمیل</span><strong>{faNumber(Math.round(((step + 1) / steps.length) * 100))}٪</strong></div>
            <div className="steps-track">{steps.map((item, index) => <button key={item} className={`${index === step ? "active" : ""} ${index < step ? "done" : ""}`} onClick={() => index <= step && setStep(index)}><span>{index < step ? <Check /> : faNumber(index + 1)}</span><div><strong>{item}</strong><small>{index < step ? "تکمیل شده" : index === step ? "در حال تکمیل" : "در انتظار"}</small></div></button>)}</div>
            <div className="draft-box"><ShieldCheck /><div><strong>بدون تکمیل خودکار</strong><small>تنها مقادیری که وارد می‌کنید در فرم قرار می‌گیرند.</small></div></div>
          </aside>
          <section className="wizard-card surface">
            <header><span>{faNumber(step + 1)}</span><div><strong>{steps[step]}</strong><small>اطلاعات این بخش را به‌صورت کامل وارد کنید.</small></div></header>
            <div className="wizard-fields">{content}</div>
            <footer className="wizard-actions desktop-wizard-actions"><div /><div><button className="button button-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowRight /> قبلی</button><button className="button button-primary" onClick={next}>{step === steps.length - 1 ? "مرور فرم" : "ادامه"}<ArrowLeft /></button></div></footer>
          </section>
        </div>
      </div>
      <div className="mobile-wizard-actions"><button className="button button-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowRight /> قبلی</button><button className="button button-primary" onClick={next}>{step === steps.length - 1 ? "مرور فرم" : "ادامه"}<ArrowLeft /></button></div>
    </div>
  );
}
