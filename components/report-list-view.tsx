"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Download, FileText, Filter, LoaderCircle, MapPin, Plus, ReceiptText, Search, Trash2, UserRound, UsersRound, Wrench } from "lucide-react";
import { useState } from "react";
import { BottomSheet, Dialog, EmptyState, ErrorState, SelectField, StatusBadge } from "./ui";

export type DailyReportListItem = {
  id: string;
  employee_id: string;
  employeeName: string;
  report_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  collaborators: string[];
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

export function ReportListView({ type, reports = [], loadError = false, showAllReports = false }: { type: "daily" | "maintenance"; reports?: DailyReportListItem[]; loadError?: boolean; showAllReports?: boolean }) {
  const maintenance = type === "maintenance";
  const [items, setItems] = useState(reports);
  const [query, setQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DailyReportListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const newHref = maintenance ? "/maintenance/new" : "/daily-reports/new";
  const normalizedQuery = query.trim().toLocaleLowerCase("fa");
  const employeeOptions = [...new Map(items.map((report) => [report.employee_id, report.employeeName])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fa"));
  const locationOptions = [...new Set(items.map((report) => report.location.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa"));
  const visibleReports = items.filter((report) => {
    const matchesQuery = !normalizedQuery || `${report.employeeName} ${report.location} ${report.collaborators.join(" ")} ${report.work_summary}`.toLocaleLowerCase("fa").includes(normalizedQuery);
    return matchesQuery && (!showAllReports || !employeeFilter || report.employee_id === employeeFilter) && (!showAllReports || !locationFilter || report.location === locationFilter);
  });
  const pendingCount = items.filter((report) => report.status === "submitted" || report.status === "revision_requested").length;
  const approvedCount = items.filter((report) => report.status === "approved").length;
  const hasFilters = Boolean(employeeFilter || locationFilter);

  function clearFilters() {
    setEmployeeFilter(""); setLocationFilter(""); setFilterOpen(false);
  }

  async function deleteReport() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError(null);
    try {
      const response = await fetch(`/api/reports/daily/${deleteTarget.id}/review`, { method: "DELETE" });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string };
      if (!response.ok) { setDeleteError(result.message ?? "حذف گزارش انجام نشد."); return; }
      setItems((current) => current.filter((report) => report.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { setDeleteError("ارتباط با سامانه برقرار نشد."); } finally { setDeleting(false); }
  }

  return (
    <div className="app-page reports-page">
      <div className="page-container">
        <div className="page-heading reports-heading">
          <div><span className="eyebrow">{maintenance ? <><Wrench /> عملیات نگهداری</> : <><CalendarDays /> عملکرد روزانه</>}</span><h1>{maintenance ? "تعمیرات و سرویس" : "گزارش‌های روزانه"}</h1><p>{maintenance ? "درخواست‌ها و اقدامات واقعی تعمیرات در این بخش قرار می‌گیرند." : showAllReports ? "همه گزارش‌های ثبت‌شده کارکنان در این بخش قرار می‌گیرند." : "فقط گزارش‌های ثبت‌شده خودتان در این بخش نمایش داده می‌شوند."}</p></div>
          <div className="heading-actions"><button className="button button-secondary mobile-hide" disabled title="داده‌ای برای دریافت وجود ندارد"><Download /> خروجی</button><Link href={newHref} className="button button-primary"><Plus /> {maintenance ? "ثبت تعمیرات" : "گزارش جدید"}</Link></div>
        </div>

        <section className="report-summary-strip">
          <article><span>همه گزارش‌ها</span><strong>{items.length.toLocaleString("fa-IR")}</strong></article>
          <article><span>در انتظار اقدام</span><strong className="warning-text">{pendingCount.toLocaleString("fa-IR")}</strong></article>
          <article><span>{maintenance ? "در حال انجام" : "تأیید شده"}</span><strong>{approvedCount.toLocaleString("fa-IR")}</strong></article>
          <article><span>{maintenance ? "تکمیل این ماه" : "ثبت‌شده"}</span><strong>{items.filter((report) => report.status === "submitted").length.toLocaleString("fa-IR")}</strong></article>
        </section>

        <section className="surface report-panel">
          <div className="report-toolbar">
            <label className="report-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder={maintenance ? "جست‌وجوی گزارش تعمیرات" : "جست‌وجوی گزارش روزانه"} /></label>
            {showAllReports && !maintenance && <div className="desktop-report-filters"><SelectField label="کارمند" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="">همه کارکنان</option>{employeeOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</SelectField><SelectField label="لوکیشن" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="">همه لوکیشن‌ها</option>{locationOptions.map((location) => <option value={location} key={location}>{location}</option>)}</SelectField>{hasFilters && <button className="clear-report-filters" onClick={clearFilters}>پاک کردن</button>}</div>}
            {showAllReports && !maintenance && <button className="button button-secondary mobile-filter-button" onClick={() => setFilterOpen(true)}><Filter /> فیلترها{hasFilters && <span>{[employeeFilter, locationFilter].filter(Boolean).length.toLocaleString("fa-IR")}</span>}</button>}
          </div>
          {showAllReports && hasFilters && <div className="active-report-filters"><span>نمایش {visibleReports.length.toLocaleString("fa-IR")} گزارش</span>{employeeFilter && <em>{employeeOptions.find(([id]) => id === employeeFilter)?.[1]}</em>}{locationFilter && <em><MapPin />{locationFilter}</em>}<button onClick={clearFilters}>حذف فیلترها</button></div>}
          {loadError ? <ErrorState /> : !maintenance && visibleReports.length > 0 ? <div className="real-report-list">{visibleReports.map((report) => <article key={report.id} className="real-report-card">
            <div className="real-report-card-head"><div className="report-person"><span className="list-avatar"><UserRound /></span><div><strong>{report.employeeName}</strong><small>{formatPersianDate(report.report_date)}</small></div></div><div className="report-card-actions"><StatusBadge tone={statusTones[report.status]}>{statusLabels[report.status]}</StatusBadge>{showAllReports && <button className="report-delete-button" onClick={() => { setDeleteError(null); setDeleteTarget(report); }} aria-label={`حذف گزارش ${report.employeeName}`}><Trash2 /></button>}</div></div>
            <p className="real-report-summary">{report.work_summary}</p>
            <div className="report-project-meta"><span><MapPin /><strong>محل کار</strong>{report.location || "ثبت نشده"}</span>{report.collaborators.length > 0 && <span><UsersRound /><strong>همراهان</strong>{report.collaborators.join("، ")}</span>}</div>
            {report.expenses && report.expenses.length > 0 && <div className="report-expenses"><header><span><ReceiptText /> مخارج</span><strong>{report.expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString("fa-IR")} تومان</strong></header>{report.expenses.map((expense) => <div className="report-expense-item" key={expense.id}><span>{expense.description}</span><strong>{expense.amount.toLocaleString("fa-IR")} تومان</strong>{expense.invoiceUrl && <a href={expense.invoiceUrl} target="_blank" rel="noreferrer">فاکتور</a>}</div>)}</div>}
            <div className="real-report-card-foot"><span><Clock3 /> ساعت کار</span><strong>{formatTime(report.start_time)} تا {formatTime(report.end_time)}</strong></div>
          </article>)}</div> : <EmptyState
            title={query || hasFilters ? "گزارشی پیدا نشد" : "هنوز گزارشی ثبت نشده است"}
            description={query || hasFilters ? "عبارت جست‌وجو یا فیلترها را تغییر دهید." : "با ثبت نخستین گزارش، اطلاعات واقعی در این فهرست نمایش داده می‌شود."}
            action={query || hasFilters ? <button className="button button-secondary" onClick={() => { setQuery(""); clearFilters(); }}>پاک کردن فیلترها</button> : <Link className="button button-secondary" href={newHref}><FileText /> ثبت نخستین گزارش</Link>}
          />}
        </section>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="فیلتر گزارش‌ها">
        <div className="sheet-fields">
          <SelectField label="کارمند" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="">همه کارکنان</option>{employeeOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</SelectField>
          <SelectField label="لوکیشن" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="">همه لوکیشن‌ها</option>{locationOptions.map((location) => <option value={location} key={location}>{location}</option>)}</SelectField>
          <div className="sheet-actions"><button className="button button-ghost" onClick={clearFilters}>پاک کردن</button><button className="button button-primary" onClick={() => setFilterOpen(false)}>نمایش نتایج</button></div>
        </div>
      </BottomSheet>
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} title="حذف گزارش" description={deleteTarget ? `گزارش ${deleteTarget.employeeName} از فهرست حذف می‌شود و فقط مدیر اصلی امکان انجام این کار را دارد.` : undefined} mark={<Trash2 />}>
        {deleteError && <p className="delete-report-error" role="alert">{deleteError}</p>}<div className="dialog-actions"><button className="button button-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>انصراف</button><button className="button button-danger" onClick={deleteReport} disabled={deleting}>{deleting ? <LoaderCircle className="spinning" /> : <Trash2 />}{deleting ? "در حال حذف..." : "حذف گزارش"}</button></div>
      </Dialog>
    </div>
  );
}
