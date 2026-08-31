"use client";

import { Check, CheckCircle2, Clipboard, HardHat, Link2, LoaderCircle, Package, Plus, RotateCcw, Search, Send, UserRound } from "lucide-react";
import { useState } from "react";
import { Dialog, EmptyState, ErrorState, StatusBadge } from "./ui";

export type TechnicianJob = { id: string; repair_item_id: string; technician_name: string; item_name: string; customer_name: string; quantity: number; status: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; handed_over_at: string | null; returned_at: string | null; created_at: string };
type DeviceOption = { id: string; itemName: string; customerName: string; availableQuantity: number };

const statusLabel = { awaiting_handover: "منتظر تحویل", with_technician: "نزد تعمیرکار", awaiting_return: "منتظر بازگشت", returned: "بازگشته" } as const;
const statusTone = { awaiting_handover: "submitted", with_technician: "progress", awaiting_return: "review", returned: "approved" } as const;
const technicianOptions = ["مهندس صادقی", "مهندس افشار", "مهندس کاکاوند", "مهندس احمدی"] as const;
const customTechnicianValue = "other";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TechnicianJobsView({ initialJobs, devices: initialDevices, loadError }: { initialJobs: TechnicianJob[]; devices: DeviceOption[]; loadError: boolean }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [devices, setDevices] = useState(initialDevices);
  const [section, setSection] = useState<"handover" | "returns">("handover");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [technicianSelection, setTechnicianSelection] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [repairItemId, setRepairItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<{ url: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const normalized = query.trim().toLocaleLowerCase("fa");
  const sectionJobs = jobs.filter((job) => section === "handover" ? job.status === "awaiting_handover" : job.status !== "awaiting_handover");
  const visible = sectionJobs.filter((job) => !normalized || `${job.technician_name} ${job.item_name} ${job.customer_name}`.toLocaleLowerCase("fa").includes(normalized));
  const selectedDevice = devices.find((device) => device.id === repairItemId);

  async function createJob(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setFormError(null);
    try {
      const response = await fetch("/api/technician-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repairItemId, technicianName, quantity }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { job?: TechnicianJob; message?: string };
      if (!response.ok || !result.job) { setFormError(result.message ?? "ثبت ارجاع انجام نشد."); return; }
      setJobs((current) => [result.job!, ...current]);
      setDevices((current) => current.map((device) => device.id === repairItemId ? { ...device, availableQuantity: device.availableQuantity - result.job!.quantity } : device).filter((device) => device.availableQuantity > 0));
      setTechnicianSelection(""); setTechnicianName(""); setRepairItemId(""); setQuantity("1"); setFormOpen(false);
    } catch { setFormError("ارتباط با سامانه برقرار نشد."); } finally { setSaving(false); }
  }

  async function createLink(job: TechnicianJob) {
    const type = job.status === "awaiting_handover" ? "handover" : "return";
    setLinkingId(job.id);
    try {
      const response = await fetch(`/api/technician-jobs/${job.id}/confirmation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { confirmationUrl?: string; message?: string };
      if (!response.ok || !result.confirmationUrl) { setFormError(result.message ?? "ساخت لینک انجام نشد."); return; }
      if (type === "return") setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: "awaiting_return" } : item));
      setCopied(false); setLinkResult({ url: result.confirmationUrl, title: type === "handover" ? "لینک تأیید تحویل به تعمیرکار" : "لینک تأیید بازگشت از تعمیرکار" });
    } catch { setFormError("ارتباط با سامانه برقرار نشد."); } finally { setLinkingId(null); }
  }

  async function copyLink() {
    if (!linkResult) return;
    await navigator.clipboard.writeText(linkResult.url); setCopied(true);
  }

  async function shareLink() {
    if (!linkResult) return;
    if (navigator.share) await navigator.share({ title: linkResult.title, url: linkResult.url }); else await copyLink();
  }

  return <div className="app-page technician-page"><div className="page-container">
    <div className="page-heading"><div><span className="eyebrow"><HardHat /> گردش دستگاه با تعمیرکار</span><h1>تحویل به تعمیرکار</h1><p>دستگاه‌های ارسالی و بازگشتی همراه با تأیید امن تعمیرکار در این بخش ثبت می‌شوند.</p></div><button className="button button-primary" onClick={() => { setFormError(null); setFormOpen(true); }}><Plus />ارجاع جدید</button></div>
    <section className="technician-summary"><article><span>کل ارجاع‌ها</span><strong>{jobs.length.toLocaleString("fa-IR")}</strong></article><article><span>نزد تعمیرکار</span><strong>{jobs.filter((job) => job.status === "with_technician" || job.status === "awaiting_return").length.toLocaleString("fa-IR")}</strong></article><article><span>بازگشته</span><strong>{jobs.filter((job) => job.status === "returned").length.toLocaleString("fa-IR")}</strong></article></section>
    <section className="surface technician-panel"><div className="technician-toolbar"><div className="technician-tabs" role="tablist" aria-label="وضعیت دستگاه‌ها"><button role="tab" aria-selected={section === "handover"} className={section === "handover" ? "active" : ""} onClick={() => setSection("handover")}><Send />تحویل به تعمیرکار <span>{jobs.filter((job) => job.status === "awaiting_handover").length.toLocaleString("fa-IR")}</span></button><button role="tab" aria-selected={section === "returns"} className={section === "returns" ? "active" : ""} onClick={() => setSection("returns")}><RotateCcw />مرجوعی <span>{jobs.filter((job) => job.status !== "awaiting_handover").length.toLocaleString("fa-IR")}</span></button></div><label><Search /><input autoComplete="off" aria-label="جست‌وجوی ارجاع‌ها" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {formError && !formOpen && <p className="technician-page-error" role="alert">{formError}</p>}
      {loadError ? <ErrorState /> : visible.length === 0 ? <EmptyState title={query ? "نتیجه‌ای پیدا نشد" : section === "returns" ? "هنوز مرجوعی ندارید" : "ارجاع در انتظار تحویلی وجود ندارد"} description={query ? "عبارت جست‌وجو را تغییر دهید." : section === "returns" ? "دستگاه‌ها پس از تأیید تحویل تعمیرکار، در این بخش قرار می‌گیرند." : "ارجاع جدید ثبت کنید و لینک تحویل را برای تعمیرکار بفرستید."} action={!query && section === "handover" ? <button className="button button-primary" onClick={() => setFormOpen(true)}><Plus />ارجاع جدید</button> : undefined} /> : <div className="technician-grid">{visible.map((job) => <article className="technician-card" key={job.id}><header><span><UserRound /></span><div><small>تعمیرکار</small><strong>{job.technician_name}</strong></div><StatusBadge tone={statusTone[job.status]}>{statusLabel[job.status]}</StatusBadge></header><div className="technician-device"><Package /><div><small>دستگاه مشتری {job.customer_name}</small><strong>{job.item_name}</strong></div><em>{job.quantity.toLocaleString("fa-IR")} عدد</em></div><footer><time>{formatDate(job.returned_at ?? job.handed_over_at ?? job.created_at)}</time>{job.status !== "returned" && <button onClick={() => createLink(job)} disabled={linkingId === job.id}>{linkingId === job.id ? <LoaderCircle className="spinning" /> : job.status === "awaiting_handover" ? <Send /> : <RotateCcw />}{job.status === "awaiting_handover" ? "لینک تحویل" : job.status === "with_technician" ? "ایجاد لینک مرجوعی" : "ارسال دوباره لینک مرجوعی"}</button>}{job.status === "returned" && <span><CheckCircle2 />مرجوع شد</span>}</footer></article>)}</div>}
    </section>
  </div>

  <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} title="ارجاع دستگاه به تعمیرکار" description="دستگاه، تعمیرکار و تعداد را مشخص کنید." mark={<HardHat />}><form className="technician-create-form" onSubmit={createJob}><label className="field"><span className="field-label">دستگاه</span><span className="input-wrap"><select className="select" autoComplete="off" value={repairItemId} onChange={(event) => { setRepairItemId(event.target.value); setQuantity("1"); }} required><option value="">انتخاب دستگاه</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.itemName} · {device.customerName} · {device.availableQuantity.toLocaleString("fa-IR")} عدد آزاد</option>)}</select></span></label><label className="field"><span className="field-label">تعمیرکار</span><span className="input-wrap"><select className="select" autoComplete="off" value={technicianSelection} onChange={(event) => { const value = event.target.value; setTechnicianSelection(value); setTechnicianName(value === customTechnicianValue ? "" : value); }} required><option value="">انتخاب تعمیرکار</option>{technicianOptions.map((name) => <option key={name} value={name}>{name}</option>)}<option value={customTechnicianValue}>تعمیرکار دیگر</option></select></span></label>{technicianSelection === customTechnicianValue && <label className="field"><span className="field-label">نام تعمیرکار دیگر</span><input className="input" autoComplete="off" value={technicianName} onChange={(event) => setTechnicianName(event.target.value)} required /></label>}<label className="field"><span className="field-label">تعداد</span><input className="input" type="number" inputMode="numeric" min="1" max={selectedDevice?.availableQuantity ?? 999} autoComplete="off" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>{formError && <p className="technician-form-error" role="alert">{formError}</p>}<div className="dialog-actions"><button type="button" className="button button-ghost" onClick={() => setFormOpen(false)} disabled={saving}>انصراف</button><button className="button button-primary" disabled={saving || !devices.length}>{saving ? <LoaderCircle className="spinning" /> : <Plus />}{saving ? "در حال ثبت..." : "ثبت ارجاع"}</button></div></form></Dialog>

  <Dialog open={Boolean(linkResult)} onClose={() => setLinkResult(null)} title={linkResult?.title ?? "لینک تأیید"} description="این لینک را برای تعمیرکار ارسال کنید." mark={<Link2 />}><div className="technician-link-box"><div dir="ltr">{linkResult?.url}</div><button className="button button-secondary" onClick={copyLink}>{copied ? <Check /> : <Clipboard />}{copied ? "کپی شد" : "کپی لینک"}</button><button className="button button-primary" onClick={shareLink}><Send />ارسال لینک</button></div></Dialog>
  </div>;
}
