"use client";

import Link from "next/link";
import { ChevronLeft, ContactRound, PackageCheck, Plus, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "./ui";

type CustomerListItem = { id: string; full_name: string; phone: string | null; created_at: string; received: number; delivered: number; latest: string | null };

export function CustomersView({ customers, loadError }: { customers: CustomerListItem[]; loadError: boolean }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("fa");
  const visible = customers.filter((customer) => !normalized || `${customer.full_name} ${customer.phone ?? ""}`.toLocaleLowerCase("fa").includes(normalized));
  const activeTotal = customers.reduce((sum, customer) => sum + customer.received, 0);
  const deliveredTotal = customers.reduce((sum, customer) => sum + customer.delivered, 0);
  return <div className="app-page customers-page"><div className="page-container">
    <div className="page-heading reports-heading"><div><span className="eyebrow"><ContactRound /> پرونده مشتریان</span><h1>مشتریان</h1><p>وسایل و قطعات دریافتی برای تعمیر در پرونده هر مشتری نگهداری می‌شود.</p></div><Link href="/customers/new" className="button button-primary"><Plus /> افزودن مشتری</Link></div>
    <section className="customer-summary-strip"><article><span>مشتریان</span><strong>{customers.length.toLocaleString("fa-IR")}</strong></article><article><span>در حال تعمیر</span><strong>{activeTotal.toLocaleString("fa-IR")}</strong></article><article><span>تحویل داده‌شده</span><strong>{deliveredTotal.toLocaleString("fa-IR")}</strong></article></section>
    <section className="surface customers-panel"><div className="customer-toolbar"><label><Search /><input autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جست‌وجوی مشتری" /></label></div>
      {loadError ? <ErrorState /> : visible.length > 0 ? <div className="customer-grid">{visible.map((customer) => <Link href={`/customers/${customer.id}`} className="customer-card" key={customer.id}><header><span><ContactRound /></span><div><strong>{customer.full_name}</strong>{customer.phone && <small dir="ltr">{customer.phone}</small>}</div><ChevronLeft /></header><div className="customer-card-stats"><span><Wrench /> در حال تعمیر <strong>{customer.received.toLocaleString("fa-IR")}</strong></span><span><PackageCheck /> تحویل‌شده <strong>{customer.delivered.toLocaleString("fa-IR")}</strong></span></div><footer>مشاهده پرونده مشتری <ChevronLeft /></footer></Link>)}</div> : <EmptyState title={query ? "مشتری پیدا نشد" : "هنوز مشتری ثبت نشده است"} description={query ? "عبارت جست‌وجو را تغییر دهید." : "برای شروع، نخستین مشتری را ثبت کنید."} action={query ? <button className="button button-secondary" onClick={() => setQuery("")}>پاک کردن جست‌وجو</button> : <Link href="/customers/new" className="button button-secondary"><Plus /> افزودن مشتری</Link>} />}
    </section>
  </div></div>;
}
