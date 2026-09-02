"use client";

import { CalendarDays, Check, ClipboardList, ImagePlus, LoaderCircle, Plus, ReceiptText, UserRound, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImageForUpload } from "@/lib/images/prepare-upload";
import { Dialog, EmptyState } from "./ui";
import { JalaliDatePicker, type JalaliDateValue } from "./jalali-date-picker";

export type ExpenseEmployee = { id: string; fullName: string; avatarUrl: string | null };
export type ExpenseRecord = { id: string; employeeId: string; employeeName: string; avatarUrl: string | null; expenseDate: string; description: string; amount: number; invoiceUrl: string | null; createdAt: string };

const emptyDate: JalaliDateValue = { year: "", month: "", day: "" };
const normalizeAmount = (value: string) => value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[^\d]/g, "").slice(0, 12);
const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));

export function ExpensesView({ initialExpenses, employees, isAdmin, viewerEmployeeId, loadError }: { initialExpenses: ExpenseRecord[]; employees: ExpenseEmployee[]; isAdmin: boolean; viewerEmployeeId: string | null; loadError: boolean }) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(isAdmin ? null : viewerEmployeeId);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState<JalaliDateValue>(emptyDate);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const groups = useMemo(() => employees.map((employee) => {
    const items = expenses.filter((expense) => expense.employeeId === employee.id);
    return { ...employee, items, total: items.reduce((sum, expense) => sum + expense.amount, 0) };
  }).sort((a, b) => b.total - a.total || a.fullName.localeCompare(b.fullName, "fa")), [employees, expenses]);
  const selectedGroup = groups.find((group) => group.id === selectedEmployeeId) ?? null;
  const ownGroup = groups.find((group) => group.id === viewerEmployeeId) ?? null;
  const grandTotal = groups.reduce((sum, group) => sum + group.total, 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date.year || !date.month || !date.day || description.trim().length < 2 || Number(amount) <= 0) { setError("تاریخ، مبلغ و شرح هزینه را کامل کنید."); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const body = new FormData();
      body.append("year", date.year); body.append("month", date.month); body.append("day", date.day);
      body.append("description", description); body.append("amount", amount);
      if (invoice) body.append("invoice", await prepareImageForUpload(invoice));
      const response = await fetch("/api/expenses", { method: "POST", body });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { expense?: ExpenseRecord; message?: string };
      if (!response.ok || !result.expense) { setError(result.message ?? "ثبت هزینه انجام نشد."); return; }
      setExpenses((current) => [result.expense!, ...current]);
      setDate(emptyDate); setDescription(""); setAmount(""); setInvoice(null); setFormOpen(false); setSuccess("هزینه با موفقیت ثبت شد.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "image_too_large" ? "حجم تصویر فاکتور قابل کاهش نیست." : "ارتباط با سامانه برقرار نشد.");
    } finally { setSaving(false); }
  }

  const detailGroup = isAdmin ? selectedGroup : ownGroup;
  return <div className="app-page expenses-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><WalletCards /> مدیریت هزینه‌ها</span><h1>مخارج</h1><p>{isAdmin ? "جمع مخارج هر کارمند و ریز فاکتورهای ثبت‌شده." : "هزینه‌های خود را ثبت و جمع مخارجتان را مشاهده کنید."}</p></div>{viewerEmployeeId && <button className="button button-primary" onClick={() => { setError(null); setFormOpen(true); }}><Plus />ثبت هزینه</button>}</div>
    {success && <p className="expenses-success"><Check />{success}</p>}
    <section className="expenses-summary"><article><span><ReceiptText /></span><div><small>{isAdmin ? "جمع کل مخارج" : "جمع مخارج من"}</small><strong>{(isAdmin ? grandTotal : ownGroup?.total ?? 0).toLocaleString("fa-IR")} <em>تومان</em></strong></div></article><article><span><ClipboardList /></span><div><small>تعداد هزینه‌های ثبت‌شده</small><strong>{(isAdmin ? expenses.length : ownGroup?.items.length ?? 0).toLocaleString("fa-IR")} <em>مورد</em></strong></div></article></section>
    {loadError ? <section className="surface"><EmptyState title="دریافت مخارج انجام نشد" description="ارتباط با دیتابیس را بررسی کنید." /></section> : isAdmin ? <section className="surface expenses-admin-panel"><div className="section-title"><div><h2>مخارج کارمندان</h2><p>برای دیدن ریز مخارج روی پروفایل هر نفر بزنید.</p></div></div><div className="expense-profile-grid">{groups.map((group) => <button key={group.id} className={selectedEmployeeId === group.id ? "active" : ""} onClick={() => setSelectedEmployeeId(group.id)}><span className={`expense-avatar ${group.avatarUrl ? "has-image" : ""}`} style={group.avatarUrl ? { backgroundImage: `url(${group.avatarUrl})` } : undefined}>{!group.avatarUrl && <UserRound />}</span><div><strong>{group.fullName}</strong><small>{group.items.length.toLocaleString("fa-IR")} هزینه ثبت‌شده</small></div><em>{group.total.toLocaleString("fa-IR")} تومان</em></button>)}</div></section> : null}
    {detailGroup ? <section className="surface expense-detail-panel"><div className="expense-detail-head"><div><span className={`expense-avatar ${detailGroup.avatarUrl ? "has-image" : ""}`} style={detailGroup.avatarUrl ? { backgroundImage: `url(${detailGroup.avatarUrl})` } : undefined}>{!detailGroup.avatarUrl && <UserRound />}</span><div><small>ریز مخارج</small><h2>{detailGroup.fullName}</h2></div></div><strong>{detailGroup.total.toLocaleString("fa-IR")} تومان</strong>{isAdmin && <button onClick={() => setSelectedEmployeeId(null)} aria-label="بستن جزئیات"><X /></button>}</div>{detailGroup.items.length ? <div className="expense-record-list">{detailGroup.items.map((expense) => <article key={expense.id}><span><CalendarDays /><strong>{formatDate(expense.expenseDate)}</strong></span><div><strong>{expense.description}</strong><small>{new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(expense.createdAt))}</small></div><em>{expense.amount.toLocaleString("fa-IR")} تومان</em>{expense.invoiceUrl ? <a href={expense.invoiceUrl} target="_blank" rel="noreferrer"><ReceiptText />مشاهده فاکتور</a> : <i>بدون فاکتور</i>}</article>)}</div> : <EmptyState title="هزینه‌ای ثبت نشده است" description="پس از ثبت نخستین هزینه، جزئیات آن اینجا نمایش داده می‌شود." />}</section> : isAdmin ? <section className="surface expense-select-empty"><EmptyState title="یک کارمند را انتخاب کنید" description="برای مشاهده ریز مخارج، روی پروفایل او بزنید." /></section> : null}
  </div>
  <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} title="ثبت هزینه" description="اطلاعات هزینه و در صورت وجود، تصویر فاکتور را وارد کنید." mark={<WalletCards />}><form className="standalone-expense-form" onSubmit={submit}><JalaliDatePicker value={date} onChange={(value) => { setDate(value); setError(null); }} /><label className="field"><span className="field-label">مبلغ</span><span className="money-input-wrap"><input className="input" inputMode="numeric" autoComplete="off" dir="ltr" value={amount} onChange={(event) => { setAmount(normalizeAmount(event.target.value)); setError(null); }} /><i>تومان</i></span>{amount && <small>{Number(amount).toLocaleString("fa-IR")} تومان</small>}</label><label className="field"><span className="field-label">برای چه موردی هزینه شده؟</span><textarea className="textarea standalone-expense-description" autoComplete="off" value={description} onChange={(event) => { setDescription(event.target.value); setError(null); }} /></label><label className={`invoice-upload ${invoice ? "has-file" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => setInvoice(event.target.files?.[0] ?? null)} /><ImagePlus /><span><strong>{invoice ? invoice.name : "افزودن تصویر فاکتور"}</strong><small>{invoice ? "تصویر آماده بارگذاری است" : "اختیاری"}</small></span></label>{error && <p className="technician-form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-ghost" onClick={() => setFormOpen(false)} disabled={saving}>انصراف</button><button className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spinning" /> : <Plus />}{saving ? "در حال ثبت..." : "ثبت هزینه"}</button></div></form></Dialog>
  </div>;
}
