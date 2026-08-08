"use client";

import Link from "next/link";
import { CalendarDays, Download, FileText, Filter, Plus, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { BottomSheet, EmptyState, SelectField } from "./ui";

export function ReportListView({ type }: { type: "daily" | "maintenance" }) {
  const maintenance = type === "maintenance";
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const newHref = maintenance ? "/maintenance/new" : "/daily-reports/new";

  return (
    <div className="app-page reports-page">
      <div className="page-container">
        <div className="page-heading reports-heading">
          <div><span className="eyebrow">{maintenance ? <><Wrench /> عملیات نگهداری</> : <><CalendarDays /> عملکرد شیفت‌ها</>}</span><h1>{maintenance ? "تعمیرات و سرویس" : "گزارش‌های روزانه"}</h1><p>{maintenance ? "درخواست‌ها و اقدامات واقعی تعمیرات در این بخش قرار می‌گیرند." : "گزارش‌های ثبت‌شدهٔ کارکنان در این بخش قرار می‌گیرند."}</p></div>
          <div className="heading-actions"><button className="button button-secondary mobile-hide" disabled title="داده‌ای برای دریافت وجود ندارد"><Download /> خروجی</button><Link href={newHref} className="button button-primary"><Plus /> {maintenance ? "ثبت تعمیرات" : "گزارش جدید"}</Link></div>
        </div>

        <section className="report-summary-strip">
          <article><span>همه گزارش‌ها</span><strong>۰</strong></article>
          <article><span>در انتظار اقدام</span><strong className="warning-text">۰</strong></article>
          <article><span>{maintenance ? "در حال انجام" : "تأیید شده"}</span><strong>۰</strong></article>
          <article><span>{maintenance ? "تکمیل این ماه" : "ثبت امروز"}</span><strong>۰</strong></article>
        </section>

        <section className="surface report-panel">
          <div className="report-toolbar">
            <label className="report-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder={maintenance ? "جست‌وجوی گزارش تعمیرات" : "جست‌وجوی گزارش روزانه"} /></label>
            <button className="button button-secondary mobile-filter-button" onClick={() => setFilterOpen(true)}><Filter /> فیلترها</button>
          </div>
          <EmptyState
            title={query ? "گزارشی پیدا نشد" : "هنوز گزارشی ثبت نشده است"}
            description={query ? "عبارت جست‌وجو را تغییر دهید." : "با ثبت نخستین گزارش، اطلاعات واقعی در این فهرست نمایش داده می‌شود."}
            action={query ? <button className="button button-secondary" onClick={() => setQuery("")}>پاک کردن جست‌وجو</button> : <Link className="button button-secondary" href={newHref}><FileText /> ثبت نخستین گزارش</Link>}
          />
        </section>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="فیلتر گزارش‌ها">
        <div className="sheet-fields">
          <SelectField label="کارمند"><option value="">همه کارکنان</option></SelectField>
          <SelectField label="وضعیت"><option value="">همه وضعیت‌ها</option></SelectField>
          <div className="date-pair"><label className="field"><span className="field-label">از تاریخ</span><input className="input" type="date" autoComplete="off" /></label><label className="field"><span className="field-label">تا تاریخ</span><input className="input" type="date" autoComplete="off" /></label></div>
          <div className="sheet-actions"><button className="button button-ghost" onClick={() => setFilterOpen(false)}>پاک کردن</button><button className="button button-primary" onClick={() => setFilterOpen(false)}>اعمال فیلتر</button></div>
        </div>
      </BottomSheet>
    </div>
  );
}
