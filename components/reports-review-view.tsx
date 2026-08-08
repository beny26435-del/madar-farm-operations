"use client";

import { CheckCircle2, ClipboardCheck, FileText, RefreshCcw, Search, ShieldCheck, Wrench, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, EmptyState, ErrorState, StatusBadge, type StatusTone } from "./ui";

type ReportStatus = "draft" | "submitted" | "approved" | "rejected" | "revision_requested";
type ReviewAction = "approved" | "rejected" | "revision_requested";
export type ReviewReportItem = {
  id: string; type: "daily" | "maintenance"; authorName: string; reportDate: string; title: string; description: string; status: ReportStatus; submittedAt: string | null; meta: string[];
  reviews: Array<{ id: string; report_type: "daily" | "maintenance"; report_id: string; reviewer_id: string; action: ReviewAction; comment: string | null; created_at: string; reviewerName: string }>;
};

const statusLabels: Record<ReportStatus, string> = { draft: "پیش‌نویس", submitted: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده", revision_requested: "نیازمند اصلاح" };
const statusTones: Record<ReportStatus, StatusTone> = { draft: "draft", submitted: "submitted", approved: "approved", rejected: "rejected", revision_requested: "review" };
const actionLabels: Record<ReviewAction, string> = { approved: "تأیید گزارش", rejected: "رد گزارش", revision_requested: "درخواست اصلاح" };

function formatDate(value: string) { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export function ReportsReviewView({ reports, loadError }: { reports: ReviewReportItem[]; loadError: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected" | "revision_requested">("pending");
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState<{ report: ReviewReportItem; action: ReviewAction } | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingCount = reports.filter((report) => report.status === "submitted").length;
  const normalized = query.trim().toLocaleLowerCase("fa");
  const visible = reports.filter((report) => (filter === "all" || (filter === "pending" ? report.status === "submitted" : report.status === filter)) && (!normalized || `${report.authorName} ${report.title} ${report.description}`.toLocaleLowerCase("fa").includes(normalized)));

  function openDecision(report: ReviewReportItem, action: ReviewAction) { setDecision({ report, action }); setComment(""); setError(null); }
  function closeDecision() { if (!pending) { setDecision(null); setComment(""); setError(null); } }
  async function submitDecision() {
    if (!decision) return;
    if (decision.action !== "approved" && comment.trim().length < 2) { setError("توضیح تصمیم را وارد کنید."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/reports/${decision.report.type}/${decision.report.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: decision.action, comment }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string };
      if (!response.ok) { setError(result.message ?? "ثبت تصمیم انجام نشد."); return; }
      setDecision(null); setComment(""); setError(null); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد."); } finally { setPending(false); }
  }

  return <div className="app-page review-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><ClipboardCheck /> مدیریت تصمیم‌ها</span><h1>بررسی گزارش‌ها</h1><p>گزارش‌های واقعی کارکنان را بررسی و نتیجه را ثبت کنید.</p></div></div>
    <section className="review-summary"><article><span>در انتظار بررسی</span><strong>{pendingCount.toLocaleString("fa-IR")}</strong></article><article><span>تأییدشده</span><strong>{reports.filter((report) => report.status === "approved").length.toLocaleString("fa-IR")}</strong></article><article><span>نیازمند اصلاح</span><strong>{reports.filter((report) => report.status === "revision_requested").length.toLocaleString("fa-IR")}</strong></article><article><span>همه گزارش‌ها</span><strong>{reports.length.toLocaleString("fa-IR")}</strong></article></section>
    <section className="surface review-panel"><div className="review-toolbar"><div className="review-filters">{([['pending','صف بررسی'],['all','همه'],['approved','تأییدشده'],['revision_requested','نیازمند اصلاح'],['rejected','ردشده']] as const).map(([value,label]) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div><label><Search /><input autoComplete="off" aria-label="جست‌وجوی گزارش" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loadError ? <ErrorState /> : visible.length === 0 ? <EmptyState title={query ? "گزارشی پیدا نشد" : filter === "pending" ? "صف بررسی خالی است" : "گزارشی در این وضعیت نیست"} description={query ? "عبارت جست‌وجو را تغییر دهید." : filter === "pending" ? "گزارشی منتظر تصمیم مدیر نیست." : "با تغییر فیلتر، گزارش‌های دیگر را ببینید."} /> : <div className="review-list">{visible.map((report) => <article className="review-card" key={`${report.type}-${report.id}`}><header><div className={`review-type ${report.type}`} >{report.type === "daily" ? <FileText /> : <Wrench />}<span>{report.type === "daily" ? "گزارش روزانه" : "تعمیرات"}</span></div><StatusBadge tone={statusTones[report.status]}>{statusLabels[report.status]}</StatusBadge></header><div className="review-card-main"><div className="review-author"><span>{report.authorName.slice(0, 1)}</span><div><strong>{report.authorName}</strong><small>{formatDate(report.reportDate)}</small></div></div><div className="review-content"><h2>{report.title}</h2>{report.description !== report.title && <p>{report.description}</p>}{report.meta.length > 0 && <div>{report.meta.map((item) => <span key={item}>{item}</span>)}</div>}</div></div>{report.reviews[0] && <div className="review-history"><ShieldCheck /><div><strong>{report.reviews[0].reviewerName}</strong><span>{actionLabels[report.reviews[0].action]} · {formatDateTime(report.reviews[0].created_at)}</span>{report.reviews[0].comment && <p>{report.reviews[0].comment}</p>}</div></div>}{report.status === "submitted" && <footer><button className="review-approve" onClick={() => openDecision(report, "approved")}><CheckCircle2 /> تأیید</button><button onClick={() => openDecision(report, "revision_requested")}><RefreshCcw /> درخواست اصلاح</button><button className="review-reject" onClick={() => openDecision(report, "rejected")}><XCircle /> رد</button></footer>}</article>)}</div>}
    </section>
  </div><Dialog open={Boolean(decision)} onClose={closeDecision} title={decision ? actionLabels[decision.action] : "ثبت تصمیم"} description={decision?.action === "approved" ? "در صورت نیاز می‌توانید توضیح کوتاهی ثبت کنید." : "توضیح این تصمیم برای کارمند نمایش داده می‌شود."}><div className="review-dialog-form"><label className="field"><span className="field-label">توضیح {decision?.action === "approved" && <span className="field-hint">اختیاری</span>}</span><textarea className="textarea" autoComplete="off" value={comment} onChange={(event) => { setComment(event.target.value); setError(null); }} /></label>{error && <p className="report-form-error" role="alert">{error}</p>}<div><button className="button button-secondary" onClick={closeDecision} disabled={pending}>انصراف</button><button className={`button ${decision?.action === "rejected" ? "button-danger" : "button-primary"}`} onClick={submitDecision} disabled={pending}>{pending ? "در حال ثبت..." : "ثبت تصمیم"}</button></div></div></Dialog></div>;
}
