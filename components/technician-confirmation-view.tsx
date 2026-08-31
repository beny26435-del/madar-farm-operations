"use client";

import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, HardHat, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { gregorianToJalali, jalaliToGregorian, parseJalaliDate } from "@/lib/date/jalali";

const jalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const faNumber = (value: number | string) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

type Confirmation = {
  type: "handover" | "return" | "rework";
  expiresAt: string;
  confirmedAt: string | null;
  requestedAt: string;
  expired: boolean;
  technician_name: string;
  item_name: string;
  customer_name: string;
  quantity: number;
  promised_return_at: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function localDateParts(value: string | null) {
  if (!value) return { year: "", month: "", day: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { year: "", month: "", day: "" };
  const jalali = gregorianToJalali(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  return {
    year: String(jalali.year),
    month: String(jalali.month),
    day: String(jalali.day),
  };
}

export function TechnicianConfirmationView({ token, confirmation }: { token: string; confirmation: Confirmation | null }) {
  const [confirmed, setConfirmed] = useState(Boolean(confirmation?.confirmedAt));
  const [confirmedAt, setConfirmedAt] = useState(confirmation?.confirmedAt ?? null);
  const initialPromisedReturn = localDateParts(confirmation?.promised_return_at ?? null);
  const [promisedDate, setPromisedDate] = useState({ year: initialPromisedReturn.year, month: initialPromisedReturn.month, day: initialPromisedReturn.day });
  const today = new Date();
  const currentJalali = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(Number(initialPromisedReturn.year) || currentJalali.year);
  const [viewMonth, setViewMonth] = useState(Number(initialPromisedReturn.month) || currentJalali.month);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReturn = confirmation?.type === "return";
  const isRework = confirmation?.type === "rework";
  const needsPromisedReturn = Boolean(confirmation && !isReturn);
  const promisedGregorianDate = parseJalaliDate(promisedDate.year, promisedDate.month, promisedDate.day);
  const promisedReturnAt = promisedGregorianDate ? `${promisedGregorianDate}T23:59:59` : "";
  const firstGregorian = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstWeekDay = (new Date(firstGregorian.year, firstGregorian.month - 1, firstGregorian.day).getDay() + 1) % 7;
  const monthLength = viewMonth <= 6 ? 31 : viewMonth <= 11 ? 30 : parseJalaliDate(String(viewYear), "12", "30") ? 30 : 29;
  const calendarCells: Array<number | null> = [...Array.from({ length: firstWeekDay }, () => null), ...Array.from({ length: monthLength }, (_, index) => index + 1)];
  const selectedDateLabel = promisedDate.year && promisedDate.month && promisedDate.day
    ? `${faNumber(promisedDate.day)} ${jalaliMonths[Number(promisedDate.month) - 1]} ${faNumber(promisedDate.year)}`
    : null;

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
    setPromisedDate({ year: String(year), month: String(month), day: String(day) });
    setDatePickerOpen(false);
    setError(null);
  }

  function isPastDate(year: number, month: number, day: number) {
    if (year !== currentJalali.year) return year < currentJalali.year;
    if (month !== currentJalali.month) return month < currentJalali.month;
    return day < currentJalali.day;
  }

  async function confirm() {
    let promisedReturnIso: string | null = null;
    if (needsPromisedReturn) {
      const selected = new Date(promisedReturnAt);
      if (!promisedReturnAt || Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
        setError("تاریخ تحویل دستگاه به مجموعه را مشخص کنید.");
        return;
      }
      promisedReturnIso = selected.toISOString();
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/technician-confirmations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promisedReturnAt: promisedReturnIso }),
      });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string; confirmedAt?: string | null };
      if (!response.ok) { setError(result.message ?? "ثبت تأیید انجام نشد."); return; }
      setConfirmed(true);
      setConfirmedAt(result.confirmedAt ?? new Date().toISOString());
    } catch {
      setError("ارتباط با سامانه برقرار نشد.");
    } finally {
      setPending(false);
    }
  }

  if (!confirmation) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><AlertTriangle /></span><h1>لینک معتبر نیست</h1><p>این لینک اشتباه است یا با لینک جدیدی جایگزین شده است.</p></section></main>;
  if (confirmation.expired) return <main className="confirmation-public-page"><section className="confirmation-public-card invalid"><span><Clock3 /></span><h1>اعتبار لینک تمام شده است</h1><p>برای دریافت لینک جدید با مجموعه تماس بگیرید.</p></section></main>;

  const kindLabel = isReturn ? "تحویل به مجموعه" : isRework ? "مرجوعی به تعمیرکار" : "تحویل به تعمیرکار";
  const question = isReturn ? "آیا این دستگاه را به مجموعه تحویل داده‌اید؟" : isRework ? "آیا این دستگاه خراب را دوباره تحویل گرفته‌اید؟" : "آیا این دستگاه را برای تعمیر تحویل گرفته‌اید؟";
  const successText = isReturn ? "تحویل دادن دستگاه به مجموعه تأیید شد." : isRework ? "تحویل مجدد دستگاه خراب برای تعمیر تأیید شد." : "تحویل گرفتن دستگاه برای تعمیر تأیید شد.";

  return <main className="confirmation-public-page"><section className="confirmation-public-card technician-confirmation-card">
    <header><div className="confirmation-brand"><span><ShieldCheck /></span><div><strong>MinePlus</strong><small>تأیید امن تعمیرکار</small></div></div><span className="confirmation-kind">{isReturn || isRework ? <RotateCcw /> : <HardHat />}{kindLabel}</span></header>
    {confirmed ? <div className="confirmation-success"><span><CheckCircle2 /></span><h1>تأیید شما ثبت شد</h1><p>{successText}</p>{needsPromisedReturn && promisedReturnAt && <div className="confirmation-promised-result"><small>تاریخ اعلام‌شده برای تحویل به مجموعه</small><strong>{formatDateOnly(promisedReturnAt)}</strong></div>}{confirmedAt && <time>{formatDate(confirmedAt)}</time>}</div> : <>
      <div className="confirmation-copy"><small>{confirmation.technician_name}</small><h1>{question}</h1><p>مشخصات زیر را بررسی کنید و فقط در صورت درست بودن، تأیید را بزنید.</p></div>
      <div className="confirmation-items"><article className="confirmation-item"><span><PackageCheck /></span><div><small>دستگاه مشتری {confirmation.customer_name}</small><strong>{confirmation.item_name}</strong><p>{confirmation.quantity.toLocaleString("fa-IR")} عدد</p></div></article></div>
      {needsPromisedReturn && <section className="confirmation-promised-field">
        <header><span><CalendarClock /></span><div><strong>چه تاریخی دستگاه را به مجموعه تحویل می‌دهید؟</strong><small>تاریخ را از تقویم شمسی انتخاب کنید</small></div></header>
        <div className="confirmation-promised-controls">
          <div className="confirmation-promised-control confirmation-promised-date jalali-picker-field">
            <span><CalendarDays />تاریخ تحویل</span>
            <button type="button" className={`jalali-picker-trigger ${selectedDateLabel ? "selected" : ""}`} aria-expanded={datePickerOpen} onClick={() => setDatePickerOpen((open) => !open)}><CalendarDays /><span>{selectedDateLabel ?? "انتخاب تاریخ"}</span><ChevronLeft /></button>
            {datePickerOpen && <><button type="button" className="jalali-picker-backdrop" aria-label="بستن تقویم" onClick={() => setDatePickerOpen(false)} /><div className="jalali-picker-panel" role="dialog" aria-modal="true" aria-label="تقویم شمسی">
              <div className="jalali-picker-header"><button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)}><ChevronRight /></button><strong>{jalaliMonths[viewMonth - 1]} {faNumber(viewYear)}</strong><button type="button" aria-label="ماه بعد" onClick={() => moveMonth(1)}><ChevronLeft /></button></div>
              <div className="jalali-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="jalali-days">{calendarCells.map((day, index) => day ? <button type="button" key={`${viewYear}-${viewMonth}-${day}`} disabled={isPastDate(viewYear, viewMonth, day)} className={`${Number(promisedDate.year) === viewYear && Number(promisedDate.month) === viewMonth && Number(promisedDate.day) === day ? "selected" : ""} ${currentJalali.year === viewYear && currentJalali.month === viewMonth && currentJalali.day === day ? "today" : ""}`} onClick={() => selectDate(viewYear, viewMonth, day)}>{faNumber(day)}</button> : <span key={`empty-${index}`} />)}</div>
              <div className="jalali-picker-footer"><button type="button" onClick={() => selectDate(currentJalali.year, currentJalali.month, currentJalali.day)}>امروز</button><button type="button" onClick={() => setDatePickerOpen(false)}>بستن</button></div>
            </div></>}
          </div>
        </div>
      </section>}
      <div className="confirmation-meta"><span>زمان ساخت درخواست</span><strong>{formatDate(confirmation.requestedAt)}</strong></div>
      {error && <p className="confirmation-error" role="alert">{error}</p>}
      <button className="button button-primary confirmation-submit" onClick={confirm} disabled={pending}><CheckCircle2 />{pending ? "در حال ثبت..." : isReturn ? "تأیید می‌کنم تحویل دادم" : "ثبت تاریخ و تأیید تحویل"}</button>
      <p className="confirmation-note"><ShieldCheck /> این لینک مخصوص همین دستگاه است و پس از تأیید دوباره استفاده نمی‌شود.</p>
    </>}
  </section></main>;
}
