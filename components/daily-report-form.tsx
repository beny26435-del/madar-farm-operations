"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { useState } from "react";
import { gregorianToJalali, isValidTime, jalaliToGregorian, normalizeTime, parseJalaliDate } from "@/lib/date/jalali";

const steps = ["زمان و تاریخ", "شرح فعالیت", "توضیحات تکمیلی"];
const faNumber = (value: number | string) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const jalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

type FormState = {
  year: string;
  month: string;
  day: string;
  startTime: string;
  endTime: string;
  workSummary: string;
  issues: string;
  actionsTaken: string;
  notes: string;
};

const emptyForm: FormState = { year: "", month: "", day: "", startTime: "", endTime: "", workSummary: "", issues: "", actionsTaken: "", notes: "" };

export function DailyReportForm({ displayName }: { displayName: string }) {
  const today = new Date();
  const currentJalali = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentJalali.year);
  const [viewMonth, setViewMonth] = useState(currentJalali.month);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const progress = `${((step + 1) / steps.length) * 100}%`;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function moveMonth(direction: -1 | 1) {
    const nextMonth = viewMonth + direction;
    if (nextMonth < 1) {
      setViewYear((year) => year - 1);
      setViewMonth(12);
    } else if (nextMonth > 12) {
      setViewYear((year) => year + 1);
      setViewMonth(1);
    } else {
      setViewMonth(nextMonth);
    }
  }

  function selectDate(year: number, month: number, day: number) {
    setForm((current) => ({ ...current, year: String(year), month: String(month), day: String(day) }));
    setError(null);
    setDatePickerOpen(false);
  }

  const firstGregorian = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstWeekDay = (new Date(firstGregorian.year, firstGregorian.month - 1, firstGregorian.day).getDay() + 1) % 7;
  const monthLength = viewMonth <= 6 ? 31 : viewMonth <= 11 ? 30 : parseJalaliDate(String(viewYear), "12", "30") ? 30 : 29;
  const calendarCells: Array<number | null> = [...Array.from({ length: firstWeekDay }, () => null), ...Array.from({ length: monthLength }, (_, index) => index + 1)];
  const selectedDateLabel = form.year && form.month && form.day ? `${faNumber(form.day)} ${jalaliMonths[Number(form.month) - 1]} ${faNumber(form.year)}` : null;

  function validateCurrentStep() {
    if (step === 0) {
      if (!parseJalaliDate(form.year, form.month, form.day)) return "تاریخ شمسی را کامل و درست وارد کنید.";
      if (!isValidTime(form.startTime) || !isValidTime(form.endTime)) return "ساعت ورود و خروج را کامل وارد کنید.";
    }
    if (step === 1 && form.workSummary.trim().length < 2) return "شرح فعالیت‌های انجام‌شده را وارد کنید.";
    return null;
  }

  async function continueOrSubmit() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string };
      if (!response.ok) {
        setError(result.message ?? "ذخیره گزارش انجام نشد.");
        return;
      }
      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (completed) {
    return <div className="app-page wizard-page"><div className="completion-card surface"><span><Check /></span><strong>گزارش ثبت شد</strong><p>گزارش در سامانه ذخیره شد و اکنون در فهرست گزارش‌های روزانه قابل مشاهده است.</p><div><Link className="button button-primary" href="/daily-reports">مشاهده گزارش‌ها</Link><button className="button button-secondary" onClick={() => { setForm(emptyForm); setStep(0); setCompleted(false); }}>ثبت گزارش جدید</button></div></div></div>;
  }

  return (
    <div className="app-page wizard-page">
      <div className="wizard-container">
        <div className="wizard-topline"><Link href="/daily-reports" className="back-link"><ArrowRight /> بازگشت</Link></div>
        <div className="wizard-heading"><div><span className="eyebrow"><CalendarDays /> گزارش روزانه</span><h1>ثبت گزارش کار</h1><p>اطلاعات در سه مرحله کوتاه ثبت می‌شود.</p></div></div>
        <div className="mobile-progress"><div><span>مرحله {faNumber(step + 1)} از {faNumber(steps.length)}</span><strong>{steps[step]}</strong></div><em>{faNumber(Math.round(((step + 1) / steps.length) * 100))}٪</em><span className="progress-track"><i style={{ width: progress }} /></span></div>

        <div className="wizard-layout">
          <aside className="wizard-steps surface">
            <div className="steps-caption"><span>روند ثبت</span><strong>{faNumber(Math.round(((step + 1) / steps.length) * 100))}٪</strong></div>
            <div className="steps-track">{steps.map((item, index) => <button type="button" key={item} className={`${index === step ? "active" : ""} ${index < step ? "done" : ""}`} onClick={() => index <= step && setStep(index)}><span>{index < step ? <Check /> : faNumber(index + 1)}</span><div><strong>{item}</strong><small>{index < step ? "تکمیل شده" : index === step ? "در حال تکمیل" : "مرحله بعد"}</small></div></button>)}</div>
            <div className="draft-box"><ShieldCheck /><div><strong>ثبت امن اطلاعات</strong><small>نام شما مستقیماً از حساب کاربری خوانده می‌شود.</small></div></div>
          </aside>

          <section className="wizard-card surface">
            <header><span>{faNumber(step + 1)}</span><div><strong>{steps[step]}</strong><small>فیلدهای ضروری با علامت مشخص شده‌اند.</small></div></header>
            <div className="wizard-fields">
              {step === 0 && <>
                <div className="report-owner-card"><span><UserRound /></span><div><small>ثبت‌کننده گزارش</small><strong>{displayName}</strong></div><i><CheckCircle2 /> حساب تأییدشده</i></div>
                <div className="report-datetime-grid">
                  <div className="field jalali-picker-field"><span className="field-label">تاریخ شمسی <span className="required-mark">ضروری</span></span>
                    <button type="button" className={`jalali-picker-trigger ${selectedDateLabel ? "selected" : ""}`} aria-expanded={datePickerOpen} onClick={() => setDatePickerOpen((open) => !open)}><CalendarDays /><span>{selectedDateLabel ?? "انتخاب تاریخ"}</span><ChevronLeft /></button>
                    {datePickerOpen && <div className="jalali-picker-panel" role="dialog" aria-label="تقویم شمسی">
                      <div className="jalali-picker-header"><button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)}><ChevronRight /></button><strong>{jalaliMonths[viewMonth - 1]} {faNumber(viewYear)}</strong><button type="button" aria-label="ماه بعد" onClick={() => moveMonth(1)}><ChevronLeft /></button></div>
                      <div className="jalali-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
                      <div className="jalali-days">{calendarCells.map((day, index) => day ? <button type="button" key={`${viewYear}-${viewMonth}-${day}`} className={`${Number(form.year) === viewYear && Number(form.month) === viewMonth && Number(form.day) === day ? "selected" : ""} ${currentJalali.year === viewYear && currentJalali.month === viewMonth && currentJalali.day === day ? "today" : ""}`} onClick={() => selectDate(viewYear, viewMonth, day)}>{faNumber(day)}</button> : <span key={`empty-${index}`} />)}</div>
                      <div className="jalali-picker-footer"><button type="button" onClick={() => selectDate(currentJalali.year, currentJalali.month, currentJalali.day)}>امروز</button><button type="button" onClick={() => setDatePickerOpen(false)}>بستن</button></div>
                    </div>}
                  </div>
                  <label className="field"><span className="field-label">ساعت ورود <span className="required-mark">ضروری</span></span><span className="time-input-wrap"><Clock3 /><input className="input time-text-input" type="text" inputMode="numeric" maxLength={5} autoComplete="off" aria-label="ساعت ورود" dir="ltr" value={form.startTime} onChange={(event) => update("startTime", normalizeTime(event.target.value))} /></span></label>
                  <label className="field"><span className="field-label">ساعت خروج <span className="required-mark">ضروری</span></span><span className="time-input-wrap"><Clock3 /><input className="input time-text-input" type="text" inputMode="numeric" maxLength={5} autoComplete="off" aria-label="ساعت خروج" dir="ltr" value={form.endTime} onChange={(event) => update("endTime", normalizeTime(event.target.value))} /></span></label>
                </div>
              </>}

              {step === 1 && <>
                <div className="form-intro-icon"><FileText /></div>
                <label className="field"><span className="field-label">فعالیت‌های انجام‌شده <span className="required-mark">ضروری</span></span><textarea className="textarea report-main-textarea" autoComplete="off" value={form.workSummary} onChange={(event) => update("workSummary", event.target.value)} /></label>
                <div className="writing-tip"><span>راهنما</span> فعالیت‌ها را کوتاه، روشن و به ترتیب انجام ثبت کنید.</div>
              </>}

              {step === 2 && <>
                <div className="form-intro-icon"><Wrench /></div>
                <label className="field"><span className="field-label">مشکلات مشاهده‌شده <span className="field-hint">اختیاری</span></span><textarea className="textarea" autoComplete="off" value={form.issues} onChange={(event) => update("issues", event.target.value)} /></label>
                <label className="field"><span className="field-label">اقدامات انجام‌شده <span className="field-hint">اختیاری</span></span><textarea className="textarea" autoComplete="off" value={form.actionsTaken} onChange={(event) => update("actionsTaken", event.target.value)} /></label>
                <label className="field"><span className="field-label">توضیحات تکمیلی <span className="field-hint">اختیاری</span></span><textarea className="textarea" autoComplete="off" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
              </>}

              {error && <p className="report-form-error" role="alert">{error}</p>}
            </div>
            <footer className="wizard-actions desktop-wizard-actions"><div /><div><button type="button" className="button button-secondary" disabled={step === 0 || isSubmitting} onClick={() => { setStep((current) => current - 1); setError(null); }}><ArrowRight /> قبلی</button><button type="button" className="button button-primary" disabled={isSubmitting} onClick={continueOrSubmit}>{isSubmitting ? "در حال ثبت..." : step === steps.length - 1 ? "ثبت گزارش" : "ادامه"}{!isSubmitting && <ArrowLeft />}</button></div></footer>
          </section>
        </div>
      </div>
      <div className="mobile-wizard-actions"><button type="button" className="button button-secondary" disabled={step === 0 || isSubmitting} onClick={() => { setStep((current) => current - 1); setError(null); }}><ArrowRight /> قبلی</button><button type="button" className="button button-primary" disabled={isSubmitting} onClick={continueOrSubmit}>{isSubmitting ? "در حال ثبت..." : step === steps.length - 1 ? "ثبت گزارش" : "ادامه"}{!isSubmitting && <ArrowLeft />}</button></div>
    </div>
  );
}
