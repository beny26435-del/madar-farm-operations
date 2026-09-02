"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { gregorianToJalali, jalaliToGregorian, parseJalaliDate } from "@/lib/date/jalali";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const faNumber = (value: number | string) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export type JalaliDateValue = { year: string; month: string; day: string };

export function JalaliDatePicker({ value, onChange }: { value: JalaliDateValue; onChange: (value: JalaliDateValue) => void }) {
  const today = new Date();
  const current = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(current.year);
  const [viewMonth, setViewMonth] = useState(current.month);
  const firstGregorian = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstWeekDay = (new Date(firstGregorian.year, firstGregorian.month - 1, firstGregorian.day).getDay() + 1) % 7;
  const monthLength = viewMonth <= 6 ? 31 : viewMonth <= 11 ? 30 : parseJalaliDate(String(viewYear), "12", "30") ? 30 : 29;
  const cells: Array<number | null> = [...Array.from({ length: firstWeekDay }, () => null), ...Array.from({ length: monthLength }, (_, index) => index + 1)];
  const selectedLabel = value.year && value.month && value.day ? `${faNumber(value.day)} ${months[Number(value.month) - 1]} ${faNumber(value.year)}` : null;

  function moveMonth(direction: -1 | 1) {
    const next = viewMonth + direction;
    if (next < 1) { setViewYear((year) => year - 1); setViewMonth(12); }
    else if (next > 12) { setViewYear((year) => year + 1); setViewMonth(1); }
    else setViewMonth(next);
  }

  function select(year: number, month: number, day: number) {
    onChange({ year: String(year), month: String(month), day: String(day) });
    setOpen(false);
  }

  return <div className="field jalali-picker-field"><span className="field-label">تاریخ هزینه</span><button type="button" className={`jalali-picker-trigger ${selectedLabel ? "selected" : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><CalendarDays /><span>{selectedLabel ?? "انتخاب تاریخ"}</span><ChevronLeft /></button>{open && <div className="jalali-picker-panel" role="dialog" aria-label="تقویم شمسی"><div className="jalali-picker-header"><button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)}><ChevronRight /></button><strong>{months[viewMonth - 1]} {faNumber(viewYear)}</strong><button type="button" aria-label="ماه بعد" onClick={() => moveMonth(1)}><ChevronLeft /></button></div><div className="jalali-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div><div className="jalali-days">{cells.map((day, index) => day ? <button type="button" key={`${viewYear}-${viewMonth}-${day}`} className={`${Number(value.year) === viewYear && Number(value.month) === viewMonth && Number(value.day) === day ? "selected" : ""} ${current.year === viewYear && current.month === viewMonth && current.day === day ? "today" : ""}`} onClick={() => select(viewYear, viewMonth, day)}>{faNumber(day)}</button> : <span key={`empty-${index}`} />)}</div><div className="jalali-picker-footer"><button type="button" onClick={() => select(current.year, current.month, current.day)}>امروز</button><button type="button" onClick={() => setOpen(false)}>بستن</button></div></div>}</div>;
}
