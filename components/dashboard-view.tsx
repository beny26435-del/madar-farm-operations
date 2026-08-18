"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ClipboardCheck, Clock3, FileText, Sparkles, UserRound, Wrench } from "lucide-react";
import { DailyTaskBoard, type DailyTask } from "./daily-task-board";
import { EmptyState, StatusBadge } from "./ui";

export type DashboardReport = {
  id: string;
  employeeName: string;
  report_date: string;
  work_summary: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested";
  submitted_at: string | null;
};

const statusLabels = { draft: "پیش‌نویس", submitted: "ثبت‌شده", approved: "تأییدشده", rejected: "ردشده", revision_requested: "نیاز به اصلاح" } as const;
const statusTones = { draft: "draft", submitted: "submitted", approved: "approved", rejected: "rejected", revision_requested: "review" } as const;

function todayLabel() {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
}

export function DashboardView({ reports, tasks, today }: { reports: DashboardReport[]; tasks: DailyTask[]; today: string }) {
  const reviewQueue = reports.filter((report) => report.status === "submitted" || report.status === "revision_requested");
  const approvedCount = reports.filter((report) => report.status === "approved").length;
  const todayCount = reports.filter((report) => report.report_date === today).length;
  const issueCount = reports.filter((report) => report.status === "rejected" || report.status === "revision_requested").length;
  const recentReports = reports.slice(0, 5);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("fa-IR", { weekday: "narrow" }).format(date), count: reports.filter((report) => report.report_date === key).length };
  });
  const maxDailyCount = Math.max(1, ...lastSevenDays.map((day) => day.count));
  const stats = [
    { label: "گزارش‌های امروز", icon: FileText, tone: "lime", value: todayCount, caption: todayCount ? "ثبت‌شده در امروز" : "امروز گزارشی ثبت نشده" },
    { label: "در انتظار بررسی", icon: Clock3, tone: "amber", value: reviewQueue.length, caption: reviewQueue.length ? "نیازمند تصمیم مدیر" : "صف بررسی خالی است" },
    { label: "تأیید شده", icon: ClipboardCheck, tone: "green", value: approvedCount, caption: approvedCount ? "گزارش تأییدشده" : "هنوز گزارشی تأیید نشده" },
    { label: "همه گزارش‌ها", icon: CalendarDays, tone: "blue", value: reports.length, caption: reports.length ? "کل گزارش‌های ثبت‌شده" : "هنوز گزارشی وجود ندارد" },
  ];
  return (
    <div className="app-page dashboard-page">
      <div className="page-container">
        <div className="dashboard-welcome">
          <div><span className="eyebrow"><Sparkles /> {todayLabel()}</span><h1>خوش آمدید</h1><p>پس از ثبت اطلاعات واقعی، وضعیت عملیات در این صفحه نمایش داده می‌شود.</p></div>
          <div className="quick-actions"><Link className="button button-secondary" href="/maintenance/new"><Wrench /> ثبت تعمیرات</Link><Link className="button button-primary" href="/daily-reports/new"><FileText /> گزارش روزانه</Link></div>
        </div>

        <DailyTaskBoard initialTasks={tasks.filter((task) => !task.completed_at)} showCompleted={false} />

        <section className="stats-grid" aria-label="شاخص‌های کلیدی">
          {stats.map((item) => <article className={`stat-card stat-${item.tone}`} key={item.label}><div className="stat-head"><span>{item.label}</span><i><item.icon /></i></div><strong className="numeric">{item.value.toLocaleString("fa-IR")}</strong><small>{item.caption}</small></article>)}
        </section>

        <div className="dashboard-grid">
          <section className="surface chart-card">
            <div className="section-title"><div><h2>روند گزارش‌های روزانه</h2><p>آمار بر اساس گزارش‌های واقعی ساخته می‌شود.</p></div></div>
            {reports.length ? <div className="dashboard-weekly-chart"><div className="chart-total"><strong>{reports.length.toLocaleString("fa-IR")}</strong><span>گزارش ثبت‌شده</span></div><div className="dashboard-week-bars">{lastSevenDays.map((day) => <div key={day.key}><span><i style={{ height: `${Math.max(day.count ? 18 : 4, (day.count / maxDailyCount) * 100)}%` }} /></span><small>{day.label}</small><em>{day.count.toLocaleString("fa-IR")}</em></div>)}</div></div> : <EmptyState title="هنوز گزارشی ثبت نشده است" description="با ثبت نخستین گزارش، نمودار فعالیت‌ها در این بخش نمایش داده می‌شود." action={<Link className="button button-secondary" href="/daily-reports/new"><FileText /> ثبت گزارش روزانه</Link>} />}
          </section>

          <section className="surface attention-card">
            <div className="section-title"><div><h2>نیازمند توجه</h2><p>گزارش‌های ردشده یا نیازمند اصلاح.</p></div><span className="attention-count">{issueCount.toLocaleString("fa-IR")}</span></div>
            {issueCount ? <div className="attention-list">{reports.filter((report) => report.status === "rejected" || report.status === "revision_requested").slice(0, 4).map((report) => <article key={report.id}><span className="attention-icon amber"><FileText /></span><div><strong>{report.employeeName}</strong><small>{report.work_summary}</small></div><ChevronLeft /></article>)}</div> : <EmptyState title="موردی نیازمند اقدام نیست" description="هیچ گزارشی برای اصلاح یا پیگیری وجود ندارد." />}
          </section>
        </div>

        <div className="dashboard-lower-grid">
          <section className="surface pending-card">
            <div className="section-title"><div><h2>صف بررسی</h2><p>گزارش‌های منتظر تصمیم مدیر.</p></div>{reviewQueue.length > 0 && <Link href="/daily-reports">مشاهده همه <ChevronLeft /></Link>}</div>
            {reviewQueue.length ? <div className="pending-list">{reviewQueue.slice(0, 5).map((report) => <article className="pending-row" key={report.id}><span className="list-avatar">{initials(report.employeeName)}</span><div className="pending-person"><strong>{report.employeeName}</strong><span>{formatDate(report.report_date)}</span></div><small>{report.work_summary}</small><StatusBadge tone={statusTones[report.status]}>{statusLabels[report.status]}</StatusBadge><ChevronLeft className="row-more" /></article>)}</div> : <EmptyState title="صف بررسی خالی است" description="هیچ گزارشی برای بررسی وجود ندارد." />}
          </section>
          <section className="surface activity-card">
            <div className="section-title"><div><h2>آخرین فعالیت‌ها</h2><p>رویدادهای ثبت‌شدهٔ سامانه در این بخش نمایش داده می‌شوند.</p></div></div>
            {recentReports.length ? <div className="activity-list">{recentReports.map((report, index) => <article key={report.id}><span className="activity-avatar"><UserRound /></span>{index < recentReports.length - 1 && <i className="activity-line" />}<div><p><strong>{report.employeeName}</strong> گزارش روزانه ثبت کرد</p><time>{formatDate(report.report_date)}</time></div></article>)}</div> : <EmptyState title="فعالیتی ثبت نشده است" description="پس از انجام نخستین عملیات، تاریخچه در این قسمت ساخته می‌شود." />}
          </section>
        </div>

        <div className="dashboard-data-note"><CalendarDays /><span>این صفحه فقط اطلاعات ثبت‌شده در سامانه را نمایش می‌دهد.</span></div>
      </div>
    </div>
  );
}
