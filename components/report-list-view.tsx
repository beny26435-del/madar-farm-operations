"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Download, FileText, Filter, Plus, ReceiptText, Search, UserRound, Wrench } from "lucide-react";
import { useState } from "react";
import { BottomSheet, EmptyState, ErrorState, SelectField, StatusBadge } from "./ui";

export type DailyReportListItem = {
  id: string;
  employee_id: string;
  employeeName: string;
  report_date: string;
  start_time: string | null;
  end_time: string | null;
  work_summary: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested";
  submitted_at: string | null;
  expenses?: Array<{ id: string; description: string; amount: number; invoiceUrl: string | null }>;
};

const statusLabels = { draft: "پیش‌نویس", submitted: "ثبت‌شده", approved: "تأییدشده", rejected: "ردشده", revision_requested: "نیاز به اصلاح" } as const;
const statusTones = { draft: "draft", submitted: "submitted", approved: "approved", rejected: "rejected", revision_requested: "review" } as const;

function formatPersianDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]) : "—";
}

export function ReportListView({ type, reports = [], loadError = false }: { type: "daily" | "maintenance"; reports?: DailyReportListItem[]; loadError?: boolean }) {
  const maintenance = type === "maintenance";
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const newHref = maintenance ? "/maintenance/new" : "/daily-reports/new";
  const normalizedQuery = query.trim().toLocaleLowerCase("fa");
  const visibleReports = reports.filter((report) => !normalizedQuery || `${report.employeeName} ${report.work_summary}`.toLocaleLowerCase("fa").includes(normalizedQuery));
  const pendingCount = reports.filter((report) => report.status === "submitted" || report.status === "revision_requested").length;
  const approvedCount = reports.filter((report) => report.status === "approved").length;

  return (
    <div className="app-page reports-page">
      <div className="page-container">
        <div className="page-heading reports-heading">
          <div><span className="eyebrow">{maintenance ? <><Wrench /> عملیات نگهداری</> : <><CalendarDays /> عملکرد روزانه</>}</span><h1>{maintenance ? "تعمیرات و سرویس" : "گزارش‌های روزانه"}</h1><p>{maintenance ? "درخواست‌ها و اقدامات واقعی تعمیرات در این بخش قرار می‌گیرند." : "گزارش‌های ثبت‌شدهٔ کارکنان در این بخش قرار می‌گیرند."}</p></div>
          <div className="heading-actions"><button className="button button-secondary mobile-hide" disabled title="داده‌ای برای دریافت وجود ندارد"><Download /> خروجی</button><Link href={newHref} className="button button-primary"><Plus /> {maintenance ? "ثبت تعمیرات" : "گزارش جدید"}</Link></div>
        </div>

        <section className="report-summary-strip">
          <article><span>همه گزارش‌ها</span><strong>{reports.length.toLocaleString("fa-IR")}</strong></article>
          <article><span>در انتظار اقدام</span><strong className="warning-text">{pendingCount.toLocaleString("fa-IR")}</strong></article>
          <article><span>{maintenance ? "در حال انجام" : "تأیید شده"}</span><strong>{approvedCount.toLocaleString("fa-IR")}</strong></article>
          <article><span>{maintenance ? "تکمیل این ماه" : "ثبت‌شده"}</span><strong>{reports.filter((report) => report.status === "submitted").length.toLocaleString("fa-IR")}</strong></article>
        </section>

        <section className="surface report-panel">
          <div className="report-toolbar">
            <label className="report-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder={maintenance ? "جست‌وجوی گزارش تعمیرات" : "جست‌وجوی گزارش روزانه"} /></label>
            <button className="button button-secondary mobile-filter-button" onClick={() => setFilterOpen(true)}><Filter /> فیلترها</button>
          </div>
          {loadError ? <ErrorState /> : !maintenance && visibleReports.length > 0 ? <div className="real-report-list">{visibleReports.map((report) => <article key={report.id} className="real-report-card">
            <div className="real-report-card-head"><div className="report-person"><span className="list-avatar"><UserRound /></span><div><strong>{report.employeeName}</strong><small>{formatPersianDate(report.report_date)}</small></div></div><StatusBadge tone={statusTones[report.status]}>{statusLabels[report.status]}</StatusBadge></div>
            <p className="real-report-summary">{report.work_summary}</p>
            {report.expenses && report.expenses.length > 0 && <div className="report-expenses"><header><span><ReceiptText /> مخارج</span><strong>{report.expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString("fa-IR")} تومان</strong></header>{report.expenses.map((expense) => <div className="report-expense-item" key={expense.id}><span>{expense.description}</span><strong>{expense.amount.toLocaleString("fa-IR")} تومان</strong>{expense.invoiceUrl && <a href={expense.invoiceUrl} target="_blank" rel="noreferrer">فاکتور</a>}</div>)}</div>}
            <div className="real-report-card-foot"><span><Clock3 /> ساعت کار</span><strong>{formatTime(report.start_time)} تا {formatTime(report.end_time)}</strong></div>
          </article>)}</div> : <EmptyState
            title={query ? "گزارشی پیدا نشد" : "هنوز گزارشی ثبت نشده است"}
            description={query ? "عبارت جست‌وجو را تغییر دهید." : "با ثبت نخستین گزارش، اطلاعات واقعی در این فهرست نمایش داده می‌شود."}
            action={query ? <button className="button button-secondary" onClick={() => setQuery("")}>پاک کردن جست‌وجو</button> : <Link className="button button-secondary" href={newHref}><FileText /> ثبت نخستین گزارش</Link>}
          />}
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
