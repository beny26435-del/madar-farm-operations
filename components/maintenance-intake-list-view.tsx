"use client";

import Link from "next/link";
import { CheckCircle2, ContactRound, Link2, Package, Plus, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, StatusBadge } from "./ui";

export type MaintenanceIntakeItem = { name: string; quantity: number; status: "received" | "delivered" };
export type MaintenanceIntake = { id: string; customerId: string; customerName: string; receivedAt: string; confirmedAt: string | null; items: MaintenanceIntakeItem[] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function MaintenanceIntakeListView({ intakes, loadError, canViewCustomers }: { intakes: MaintenanceIntake[]; loadError: boolean; canViewCustomers: boolean }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("fa");
  const visible = intakes.filter((intake) => !normalized || `${intake.customerName} ${intake.items.map((item) => item.name).join(" ")}`.toLocaleLowerCase("fa").includes(normalized));
  const totalQuantity = intakes.reduce((sum, intake) => sum + intake.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const activeQuantity = intakes.reduce((sum, intake) => sum + intake.items.filter((item) => item.status === "received").reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const deliveredQuantity = totalQuantity - activeQuantity;

  return <div className="app-page maintenance-list-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><Wrench /> تعمیرات مشتریان</span><h1>تعمیرات و سرویس</h1><p>وسایلی که برای تعمیر تحویل گرفته‌اید در این صفحه نمایش داده می‌شوند.</p></div><Link className="button button-primary" href="/maintenance/new"><Plus />ثبت تعمیرات</Link></div>
    <section className="maintenance-summary"><article><span>دفعات پذیرش</span><strong>{intakes.length.toLocaleString("fa-IR")}</strong></article><article><span>در حال تعمیر</span><strong>{activeQuantity.toLocaleString("fa-IR")}</strong></article><article><span>تحویل داده‌شده</span><strong>{deliveredQuantity.toLocaleString("fa-IR")}</strong></article></section>
    <section className="surface maintenance-panel"><div className="maintenance-toolbar"><label><Search /><input autoComplete="off" aria-label="جست‌وجوی تعمیرات" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loadError ? <ErrorState /> : visible.length === 0 ? <EmptyState title={query ? "نتیجه‌ای پیدا نشد" : "هنوز تعمیراتی ثبت نشده است"} description={query ? "عبارت جست‌وجو را تغییر دهید." : "با ثبت تعمیرات، موارد تحویل‌گرفته‌شده اینجا نمایش داده می‌شوند."} action={!query ? <Link className="button button-primary" href="/maintenance/new"><Plus />ثبت تعمیرات</Link> : undefined} /> : <div className="maintenance-intake-grid">{visible.map((intake) => {
        const active = intake.items.some((item) => item.status === "received");
        const content = <><header><span><ContactRound /></span><div><strong>{intake.customerName}</strong><small>{formatDate(intake.receivedAt)}</small></div><StatusBadge tone={active ? "progress" : "approved"}>{active ? "در حال تعمیر" : "تحویل کامل"}</StatusBadge></header><div className="maintenance-card-items">{intake.items.map((item, index) => <span key={`${item.name}-${index}`}><Package /><strong>{item.name}</strong><em>{item.quantity.toLocaleString("fa-IR")} عدد</em>{item.status === "delivered" && <CheckCircle2 />}</span>)}</div><footer><span className={intake.confirmedAt ? "confirmed" : "waiting"}>{intake.confirmedAt ? <CheckCircle2 /> : <Link2 />}{intake.confirmedAt ? "تأییدشده توسط مشتری" : "منتظر تأیید مشتری"}</span><strong>{intake.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("fa-IR")} وسیله</strong></footer></>;
        return canViewCustomers ? <Link className="maintenance-intake-card" href={`/customers/${intake.customerId}`} key={intake.id}>{content}</Link> : <article className="maintenance-intake-card" key={intake.id}>{content}</article>;
      })}</div>}
    </section>
  </div></div>;
}
