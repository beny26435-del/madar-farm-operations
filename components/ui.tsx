"use client";

import { AlertTriangle, ChevronDown, Inbox, LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";

export type StatusTone = "approved" | "completed" | "active" | "pending" | "progress" | "needs-part" | "submitted" | "review" | "draft" | "initial" | "rejected" | "cancelled";

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function SelectField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}{hint && <span className="field-hint">{hint}</span>}</span>
      <span className="input-wrap">
        <select className="select" autoComplete="off">{children}</select>
        <ChevronDown className="input-icon" aria-hidden />
      </span>
    </label>
  );
}

export function EmptyState({ title = "موردی برای نمایش نیست", description = "با تغییر فیلترها دوباره تلاش کنید.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Inbox /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="empty-state error-state">
      <span className="empty-icon"><AlertTriangle /></span>
      <strong>دریافت اطلاعات ممکن نشد</strong>
      <p>ارتباط با سامانه برقرار نشد. اطلاعات فرم شما محفوظ مانده است.</p>
      <button className="button button-secondary"><LoaderCircle /> تلاش دوباره</button>
    </div>
  );
}

export function Dialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children?: React.ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button className="dialog-close" onClick={onClose} aria-label="بستن"><X /></button>
        <div className="dialog-mark"><AlertTriangle /></div>
        <h2 id="dialog-title">{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </section>
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="overlay sheet-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet-handle" />
        <div className="sheet-title"><h2>{title}</h2><button onClick={onClose} aria-label="بستن"><X /></button></div>
        {children}
      </section>
    </div>
  );
}
