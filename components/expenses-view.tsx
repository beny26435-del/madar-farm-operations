"use client";

import { BadgeCheck, CalendarDays, Check, ChevronLeft, ClipboardList, ImagePlus, LoaderCircle, Plus, ReceiptText, RotateCcw, UserRound, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImageForUpload } from "@/lib/images/prepare-upload";
import { Dialog, EmptyState } from "./ui";
import { JalaliDatePicker, type JalaliDateValue } from "./jalali-date-picker";
import styles from "./expenses-view.module.css";

export type ExpenseEmployee = { id: string; fullName: string; avatarUrl: string | null };
export type ExpenseRecord = { id: string; employeeId: string; employeeName: string; avatarUrl: string | null; expenseDate: string; description: string; amount: number; invoiceUrl: string | null; paidAt: string | null; paidBy: string | null; createdAt: string };
type ExpenseFilter = "unpaid" | "paid" | "all";

const emptyDate: JalaliDateValue = { year: "", month: "", day: "" };
const normalizeAmount = (value: string) => value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[^\d]/g, "").slice(0, 12);
const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
const formatMoney = (value: number) => value.toLocaleString("fa-IR");

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
  const [changingPaymentId, setChangingPaymentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExpenseFilter>("unpaid");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const groups = useMemo(() => employees.map((employee) => {
    const items = expenses.filter((expense) => expense.employeeId === employee.id);
    const unpaidItems = items.filter((expense) => !expense.paidAt);
    const paidItems = items.filter((expense) => expense.paidAt);
    return { ...employee, items, unpaidItems, paidItems, outstanding: unpaidItems.reduce((sum, expense) => sum + expense.amount, 0), paidTotal: paidItems.reduce((sum, expense) => sum + expense.amount, 0) };
  }).sort((a, b) => b.outstanding - a.outstanding || a.fullName.localeCompare(b.fullName, "fa")), [employees, expenses]);
  const selectedGroup = groups.find((group) => group.id === selectedEmployeeId) ?? null;
  const ownGroup = groups.find((group) => group.id === viewerEmployeeId) ?? null;
  const grandOutstanding = groups.reduce((sum, group) => sum + group.outstanding, 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date.year || !date.month || !date.day || description.trim().length < 2 || Number(amount) <= 0) {
      setError("تاریخ، مبلغ و شرح هزینه را کامل کنید.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body = new FormData();
      body.append("year", date.year);
      body.append("month", date.month);
      body.append("day", date.day);
      body.append("description", description);
      body.append("amount", amount);
      if (invoice) body.append("invoice", await prepareImageForUpload(invoice));
      const response = await fetch("/api/expenses", { method: "POST", body });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { expense?: ExpenseRecord; message?: string };
      if (!response.ok || !result.expense) {
        setError(result.message ?? "ثبت هزینه انجام نشد.");
        return;
      }
      setExpenses((current) => [result.expense!, ...current]);
      setDate(emptyDate);
      setDescription("");
      setAmount("");
      setInvoice(null);
      setFormOpen(false);
      setSuccess("هزینه با موفقیت ثبت شد.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "image_too_large" ? "حجم تصویر فاکتور قابل کاهش نیست." : "ارتباط با سامانه برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function changePayment(expense: ExpenseRecord) {
    setChangingPaymentId(expense.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseId: expense.id, paid: !expense.paidAt }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { paidAt?: string | null; paidBy?: string | null; message?: string };
      if (!response.ok) {
        setError(result.message ?? "تغییر وضعیت پرداخت انجام نشد.");
        return;
      }
      setExpenses((current) => current.map((item) => item.id === expense.id ? { ...item, paidAt: result.paidAt ?? null, paidBy: result.paidBy ?? null } : item));
      setSuccess(result.message ?? "وضعیت پرداخت به‌روزرسانی شد.");
      router.refresh();
    } catch {
      setError("ارتباط با سامانه برقرار نشد.");
    } finally {
      setChangingPaymentId(null);
    }
  }

  const detailGroup = isAdmin ? selectedGroup : ownGroup;
  const visibleTotal = isAdmin ? grandOutstanding : ownGroup?.outstanding ?? 0;
  const visibleCount = isAdmin ? expenses.filter((expense) => !expense.paidAt).length : ownGroup?.unpaidItems.length ?? 0;
  const filteredItems = detailGroup ? filter === "all" ? detailGroup.items : filter === "paid" ? detailGroup.paidItems : detailGroup.unpaidItems : [];

  return <div className="app-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><WalletCards /> مدیریت هزینه‌ها</span><h1>مخارج</h1><p>{isAdmin ? "جمع مخارج هر کارمند و ریز فاکتورهای ثبت‌شده." : "هزینه‌های خود را ثبت و جمع مخارجتان را مشاهده کنید."}</p></div>{viewerEmployeeId && <button className="button button-primary" onClick={() => { setError(null); setFormOpen(true); }}><Plus />ثبت هزینه</button>}</div>
    {success && <p className={styles.success}><Check />{success}</p>}
    {error && !formOpen && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.summaryGrid} aria-label="خلاصه مخارج">
      <article className={styles.totalCard}><span className={styles.summaryIcon}><WalletCards /></span><div><small>{isAdmin ? "مانده قابل پرداخت همه کارمندان" : "مانده قابل پرداخت من"}</small><strong>{formatMoney(visibleTotal)} <em>تومان</em></strong></div><span className={styles.summaryDecoration} aria-hidden="true" /></article>
      <article className={styles.countCard}><span className={styles.summaryIcon}><ClipboardList /></span><div><small>هزینه‌های پرداخت‌نشده</small><strong>{formatMoney(visibleCount)} <em>مورد</em></strong></div></article>
    </section>
    {loadError ? <section className="surface"><EmptyState title="دریافت مخارج انجام نشد" description="ارتباط با دیتابیس را بررسی کنید." /></section> : isAdmin ? <section className={`surface ${styles.peoplePanel}`}>
      <header className={styles.sectionHeader}><div><h2>مخارج کارمندان</h2><p>هر پروفایل را انتخاب کنید تا ریز هزینه‌ها و فاکتورها نمایش داده شود.</p></div><span>{formatMoney(groups.length)} کارمند</span></header>
      <div className={styles.profileGrid}>{groups.map((group) => <button type="button" key={group.id} className={selectedEmployeeId === group.id ? styles.profileActive : ""} onClick={() => { setSelectedEmployeeId(group.id); setFilter("unpaid"); }}>
        <span className={`${styles.avatar} ${group.avatarUrl ? styles.avatarImage : ""}`} style={group.avatarUrl ? { backgroundImage: `url(${group.avatarUrl})` } : undefined}>{!group.avatarUrl && <UserRound />}</span><div><strong>{group.fullName}</strong><small>{formatMoney(group.unpaidItems.length)} پرداخت‌نشده · {formatMoney(group.paidItems.length)} پرداخت‌شده</small></div><span className={styles.profileAmount}>{formatMoney(group.outstanding)} <small>مانده تومان</small></span><ChevronLeft className={styles.profileArrow} />
      </button>)}</div>
    </section> : null}
    {detailGroup ? <section className={`surface ${styles.detailPanel}`}>
      <header className={styles.detailHeader}><div className={styles.detailPerson}><span className={`${styles.avatar} ${detailGroup.avatarUrl ? styles.avatarImage : ""}`} style={detailGroup.avatarUrl ? { backgroundImage: `url(${detailGroup.avatarUrl})` } : undefined}>{!detailGroup.avatarUrl && <UserRound />}</span><div><small>ریز مخارج</small><h2>{detailGroup.fullName}</h2></div></div><div className={styles.detailTotal}><small>مانده قابل پرداخت</small><strong>{formatMoney(detailGroup.outstanding)} تومان</strong></div>{isAdmin && <button type="button" className={styles.closeDetail} onClick={() => setSelectedEmployeeId(null)} aria-label="بستن جزئیات"><X /></button>}</header>
      <div className={styles.filters} role="tablist" aria-label="فیلتر وضعیت پرداخت">{([['unpaid','پرداخت‌نشده',detailGroup.unpaidItems.length],['paid','پرداخت‌شده',detailGroup.paidItems.length],['all','همه',detailGroup.items.length]] as const).map(([value,label,count]) => <button type="button" role="tab" aria-selected={filter === value} className={filter === value ? styles.filterActive : ""} onClick={() => setFilter(value)} key={value}>{label}<span>{formatMoney(count)}</span></button>)}</div>
      {filteredItems.length ? <div className={styles.records}>{filteredItems.map((expense) => <article key={expense.id} className={expense.paidAt ? styles.recordPaid : ""}><span className={styles.recordDate}><CalendarDays /><strong>{formatDate(expense.expenseDate)}</strong></span><div className={styles.recordDescription}><strong>{expense.description}</strong><small>{expense.paidAt ? `پرداخت‌شده در ${new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(expense.paidAt))}` : "در انتظار پرداخت"}</small></div><strong className={styles.recordAmount}>{formatMoney(expense.amount)} تومان</strong><div className={styles.recordActions}>{expense.invoiceUrl ? <a className={styles.invoiceLink} href={expense.invoiceUrl} target="_blank" rel="noreferrer"><ReceiptText />فاکتور</a> : <span className={styles.noInvoice}>بدون فاکتور</span>}{isAdmin && <button type="button" className={expense.paidAt ? styles.undoPayment : styles.markPaid} disabled={changingPaymentId === expense.id} onClick={() => void changePayment(expense)}>{changingPaymentId === expense.id ? <LoaderCircle className="spinning" /> : expense.paidAt ? <RotateCcw /> : <BadgeCheck />}{expense.paidAt ? "لغو پرداخت" : "پرداخت شد"}</button>}</div></article>)}</div> : <EmptyState title={filter === "paid" ? "هزینه پرداخت‌شده‌ای وجود ندارد" : filter === "unpaid" ? "همه مخارج این بخش پرداخت شده‌اند" : "هزینه‌ای ثبت نشده است"} description="با تغییر فیلتر می‌توانید وضعیت‌های دیگر را مشاهده کنید." />}
    </section> : isAdmin ? <section className={`surface ${styles.selectEmpty}`}><EmptyState title="یک کارمند را انتخاب کنید" description="برای مشاهده ریز مخارج، روی پروفایل او بزنید." /></section> : null}
  </div>
  <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} title="ثبت هزینه" description="اطلاعات هزینه و در صورت وجود، تصویر فاکتور را وارد کنید." mark={<WalletCards />}><form className={styles.form} onSubmit={submit}><JalaliDatePicker value={date} onChange={(value) => { setDate(value); setError(null); }} /><label className="field"><span className="field-label">مبلغ</span><span className="money-input-wrap"><input className="input" inputMode="numeric" autoComplete="off" dir="ltr" value={amount} onChange={(event) => { setAmount(normalizeAmount(event.target.value)); setError(null); }} /><i>تومان</i></span>{amount && <small>{formatMoney(Number(amount))} تومان</small>}</label><label className="field"><span className="field-label">برای چه موردی هزینه شده؟</span><textarea className={`textarea ${styles.description}`} autoComplete="off" value={description} onChange={(event) => { setDescription(event.target.value); setError(null); }} /></label><label className={`invoice-upload ${invoice ? "has-file" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => setInvoice(event.target.files?.[0] ?? null)} /><ImagePlus /><span><strong>{invoice ? invoice.name : "افزودن تصویر فاکتور"}</strong><small>{invoice ? "تصویر آماده بارگذاری است" : "اختیاری"}</small></span></label>{error && <p className="technician-form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-ghost" onClick={() => setFormOpen(false)} disabled={saving}>انصراف</button><button className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spinning" /> : <Plus />}{saving ? "در حال ثبت..." : "ثبت هزینه"}</button></div></form></Dialog>
  </div>;
}
