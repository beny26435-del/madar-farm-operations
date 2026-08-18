"use client";

import { Activity, CheckCircle2, ContactRound, FileText, HardHat, PackageCheck, RefreshCcw, Search, Trash2, UserPlus, Wrench, XCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "./ui";

export type ActivityItem = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, string>; created_at: string; actorName: string };
type Category = "all" | "reports" | "customers" | "employees";

const actionCopy: Record<string, { verb: string; category: Exclude<Category, "all">; tone: string }> = {
  "daily_report.submitted": { verb: "گزارش روزانه ثبت کرد", category: "reports", tone: "blue" },
  "daily_task.created": { verb: "یک کار روزانه اضافه کرد", category: "reports", tone: "blue" },
  "daily_task.completed": { verb: "یک کار روزانه را انجام داد", category: "reports", tone: "green" },
  "daily_task.reopened": { verb: "یک کار روزانه را به فهرست برگرداند", category: "reports", tone: "amber" },
  "report.approved": { verb: "گزارش را تأیید کرد", category: "reports", tone: "green" },
  "report.rejected": { verb: "گزارش را رد کرد", category: "reports", tone: "red" },
  "report.revision_requested": { verb: "برای گزارش درخواست اصلاح ثبت کرد", category: "reports", tone: "amber" },
  "report.deleted": { verb: "یک گزارش را حذف کرد", category: "reports", tone: "red" },
  "customer.created": { verb: "پرونده مشتری ساخت", category: "customers", tone: "purple" },
  "repair_intake.created": { verb: "تعمیرات مشتری را ثبت کرد", category: "customers", tone: "amber" },
  "repair_item.received": { verb: "یک مورد برای تعمیر تحویل گرفت", category: "customers", tone: "amber" },
  "repair_item.delivered": { verb: "مورد تعمیرشده را تحویل داد", category: "customers", tone: "green" },
  "repair_item.delivery_requested": { verb: "لینک تأیید تحویل ساخت", category: "customers", tone: "amber" },
  "customer_confirmation.intake": { verb: "تحویل وسیله به تعمیرگاه را تأیید کرد", category: "customers", tone: "green" },
  "customer_confirmation.delivery": { verb: "تحویل گرفتن وسیله را تأیید کرد", category: "customers", tone: "green" },
  "technician_job.created": { verb: "دستگاهی را به تعمیرکار ارجاع داد", category: "customers", tone: "purple" },
  "technician_link.handover": { verb: "لینک تحویل به تعمیرکار ساخت", category: "customers", tone: "amber" },
  "technician_link.return": { verb: "لینک بازگشت از تعمیرکار ساخت", category: "customers", tone: "amber" },
  "technician_confirmation.handover": { verb: "تحویل دستگاه به تعمیرکار را تأیید کرد", category: "customers", tone: "green" },
  "technician_confirmation.return": { verb: "بازگشت دستگاه از تعمیرکار را تأیید کرد", category: "customers", tone: "green" },
  "employee.created": { verb: "حساب کارمند ساخت", category: "employees", tone: "purple" },
};

function actionIcon(action: string) {
  if (action === "report.approved" || action === "daily_task.completed") return <CheckCircle2 />;
  if (action === "report.rejected") return <XCircle />;
  if (action === "report.deleted") return <Trash2 />;
  if (action === "report.revision_requested") return <RefreshCcw />;
  if (action === "customer.created") return <ContactRound />;
  if (action === "repair_item.received" || action === "repair_intake.created") return <Wrench />;
  if (action === "repair_item.delivered") return <PackageCheck />;
  if (action === "employee.created") return <UserPlus />;
  if (action.startsWith("technician_")) return <HardHat />;
  return <FileText />;
}

function detailFor(item: ActivityItem) {
  if (item.action === "daily_report.submitted") return item.metadata.summary;
  if (item.action.startsWith("daily_task.")) return item.metadata.title;
  if (item.action.startsWith("report.")) return item.metadata.title || item.metadata.comment;
  if (item.action === "customer.created") return item.metadata.customer_name;
  if (item.action === "repair_intake.created") return [item.metadata.customer_name, item.metadata.total_quantity ? `${item.metadata.total_quantity} وسیله` : ""].filter(Boolean).join(" · ");
  if (item.action.startsWith("repair_item.") || item.action.startsWith("customer_confirmation.")) return [item.metadata.item_name, item.metadata.customer_name].filter(Boolean).join(" · ");
  if (item.action.startsWith("technician_")) return [item.metadata.item_name, item.metadata.technician_name].filter(Boolean).join(" · ");
  if (item.action === "employee.created") return item.metadata.employee_name;
  return "";
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export function ActivityView({ items, loadError }: { items: ActivityItem[]; loadError: boolean }) {
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("fa");
  const visible = items.filter((item) => {
    const copy = actionCopy[item.action] ?? { verb: "یک فعالیت ثبت کرد", category: "reports" as const, tone: "blue" };
    return (category === "all" || copy.category === category) && (!normalized || `${item.actorName} ${copy.verb} ${detailFor(item)}`.toLocaleLowerCase("fa").includes(normalized));
  });
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
  const todayCount = items.filter((item) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date(item.created_at)) === todayKey).length;
  return <div className="app-page activity-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><Activity /> تاریخچه سامانه</span><h1>فعالیت‌ها</h1><p>رویدادهای واقعی ثبت‌شده در سامانه به ترتیب زمان نمایش داده می‌شوند.</p></div></div>
    <section className="activity-summary"><article><span>همه فعالیت‌ها</span><strong>{items.length.toLocaleString("fa-IR")}</strong></article><article><span>فعالیت‌های امروز</span><strong>{todayCount.toLocaleString("fa-IR")}</strong></article><article><span>رویدادهای گزارش</span><strong>{items.filter((item) => (actionCopy[item.action]?.category ?? "reports") === "reports").length.toLocaleString("fa-IR")}</strong></article></section>
    <section className="surface activity-panel"><div className="activity-toolbar"><div>{([['all','همه'],['reports','گزارش‌ها'],['customers','مشتریان و تعمیرات'],['employees','کارکنان']] as const).map(([value,label]) => <button className={category === value ? "active" : ""} onClick={() => setCategory(value)} key={value}>{label}</button>)}</div><label><Search /><input autoComplete="off" aria-label="جست‌وجوی فعالیت" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loadError ? <ErrorState /> : visible.length === 0 ? <EmptyState title={query ? "فعالیتی پیدا نشد" : "هنوز فعالیتی ثبت نشده است"} description={query ? "عبارت جست‌وجو یا فیلتر را تغییر دهید." : "با ثبت عملیات واقعی، تاریخچه در این صفحه ساخته می‌شود."} /> : <div className="activity-timeline">{visible.map((item) => { const copy = actionCopy[item.action] ?? { verb: "یک فعالیت ثبت کرد", category: "reports" as const, tone: "blue" }; const detail = detailFor(item); return <article key={item.id}><div className={`activity-event-icon ${copy.tone}`}>{actionIcon(item.action)}</div><div className="activity-event-copy"><p><strong>{item.actorName}</strong> {copy.verb}</p>{detail && <span>{detail}</span>}<time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time></div></article>; })}</div>}
    </section>
  </div></div>;
}
