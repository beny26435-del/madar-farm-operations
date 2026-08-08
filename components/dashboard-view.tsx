"use client";

import Link from "next/link";
import { CalendarDays, ClipboardCheck, Clock3, FileText, Sparkles, Wrench } from "lucide-react";
import { EmptyState } from "./ui";

const stats = [
  { label: "گزارش‌های امروز", icon: FileText, tone: "lime" },
  { label: "در انتظار بررسی", icon: Clock3, tone: "amber" },
  { label: "تأیید شده", icon: ClipboardCheck, tone: "green" },
  { label: "تعمیرات این ماه", icon: Wrench, tone: "blue" },
];

function todayLabel() {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function DashboardView() {
  return (
    <div className="app-page dashboard-page">
      <div className="page-container">
        <div className="dashboard-welcome">
          <div><span className="eyebrow"><Sparkles /> {todayLabel()}</span><h1>خوش آمدید</h1><p>پس از ثبت اطلاعات واقعی، وضعیت عملیات در این صفحه نمایش داده می‌شود.</p></div>
          <div className="quick-actions"><Link className="button button-secondary" href="/maintenance/new"><Wrench /> ثبت تعمیرات</Link><Link className="button button-primary" href="/daily-reports/new"><FileText /> گزارش روزانه</Link></div>
        </div>

        <section className="stats-grid stats-grid-empty" aria-label="شاخص‌های کلیدی">
          {stats.map((item) => <article className={`stat-card stat-${item.tone}`} key={item.label}><div className="stat-head"><span>{item.label}</span><i><item.icon /></i></div><strong className="numeric">۰</strong><small>داده‌ای ثبت نشده است</small></article>)}
        </section>

        <div className="dashboard-grid">
          <section className="surface chart-card">
            <div className="section-title"><div><h2>روند گزارش‌های روزانه</h2><p>آمار بر اساس گزارش‌های واقعی ساخته می‌شود.</p></div></div>
            <EmptyState title="هنوز گزارشی ثبت نشده است" description="با ثبت نخستین گزارش، نمودار فعالیت‌ها در این بخش نمایش داده می‌شود." action={<Link className="button button-secondary" href="/daily-reports/new"><FileText /> ثبت گزارش روزانه</Link>} />
          </section>

          <section className="surface attention-card">
            <div className="section-title"><div><h2>نیازمند توجه</h2><p>موارد واقعی نیازمند اقدام در این بخش قرار می‌گیرند.</p></div><span className="attention-count">۰</span></div>
            <EmptyState title="موردی نیازمند اقدام نیست" description="هنوز گزارش یا تعمیراتی برای پیگیری ثبت نشده است." />
          </section>
        </div>

        <div className="dashboard-lower-grid">
          <section className="surface pending-card">
            <div className="section-title"><div><h2>صف بررسی</h2><p>گزارش‌های واقعی منتظر تصمیم در اینجا نمایش داده می‌شوند.</p></div></div>
            <EmptyState title="صف بررسی خالی است" description="هیچ گزارشی برای بررسی وجود ندارد." />
          </section>
          <section className="surface activity-card">
            <div className="section-title"><div><h2>آخرین فعالیت‌ها</h2><p>رویدادهای ثبت‌شدهٔ سامانه در این بخش نمایش داده می‌شوند.</p></div></div>
            <EmptyState title="فعالیتی ثبت نشده است" description="پس از انجام نخستین عملیات، تاریخچه در این قسمت ساخته می‌شود." />
          </section>
        </div>

        <div className="dashboard-data-note"><CalendarDays /><span>این صفحه فقط اطلاعات ثبت‌شده در سامانه را نمایش می‌دهد.</span></div>
      </div>
    </div>
  );
}
