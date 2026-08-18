"use client";

import { Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, ListTodo, LoaderCircle, Plus, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import type { DailyTask } from "./daily-task-board";
import { EmptyState, ErrorState } from "./ui";

const pageSize = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function DailyTasksArchive({ initialTasks, initialCount, loadError }: { initialTasks: DailyTask[]; initialCount: number; loadError: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<"pending" | "completed">("pending");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status, nextPage = page, nextSearch = search) {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ scope: "all", status: nextStatus, page: String(nextPage), pageSize: String(pageSize) });
      if (nextSearch) params.set("search", nextSearch);
      const response = await fetch(`/api/daily-tasks?${params}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { tasks?: DailyTask[]; count?: number; message?: string };
      if (!response.ok || !result.tasks) { setError(result.message ?? "دریافت فهرست انجام نشد."); return; }
      setTasks(result.tasks); setCount(result.count ?? 0); setStatus(nextStatus); setPage(nextPage); setSearch(nextSearch);
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setLoading(false); }
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (newTitle.trim().length < 2) { setError("عنوان کار را کامل وارد کنید."); return; }
    setAdding(true); setError(null);
    try {
      const response = await fetch("/api/daily-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { task?: DailyTask; message?: string };
      if (!response.ok || !result.task) { setError(result.message ?? "افزودن کار انجام نشد."); return; }
      setNewTitle("");
      if (status === "pending" && page === 1 && !search) { setTasks((current) => [result.task!, ...current].slice(0, pageSize)); setCount((value) => value + 1); }
      else await load("pending", 1, "");
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setAdding(false); }
  }

  async function toggleTask(task: DailyTask) {
    setChangingId(task.id); setError(null);
    try {
      const response = await fetch("/api/daily-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed: status === "pending" }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { message?: string };
      if (!response.ok) { setError(result.message ?? "تغییر وضعیت کار انجام نشد."); return; }
      const remaining = tasks.filter((item) => item.id !== task.id);
      setTasks(remaining); setCount((value) => Math.max(0, value - 1));
      if (remaining.length === 0 && page > 1) await load(status, page - 1, search);
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setChangingId(null); }
  }

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  return <div className="app-page daily-tasks-page"><div className="page-container"><div className="page-heading"><div><span className="eyebrow"><ListTodo /> فهرست مشترک تیم</span><h1>کارهای روزانه</h1><p>کارهای در جریان و آرشیو انجام‌شده‌ها بدون شلوغ کردن داشبورد در این صفحه نگهداری می‌شوند.</p></div></div>
    <section className="surface daily-tasks-archive"><form className="task-archive-add" onSubmit={addTask}><label htmlFor="archive-new-task">کار جدید</label><div><input id="archive-new-task" className="input" autoComplete="off" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /><button className="button button-primary" disabled={adding}>{adding ? <LoaderCircle className="spinning" /> : <Plus />}{adding ? "در حال افزودن..." : "افزودن"}</button></div></form>
      <div className="task-archive-toolbar"><div className="task-status-tabs"><button className={status === "pending" ? "active" : ""} onClick={() => load("pending", 1, search)}><Circle />انجام‌نشده</button><button className={status === "completed" ? "active" : ""} onClick={() => load("completed", 1, search)}><CheckCircle2 />انجام‌شده</button></div><form onSubmit={(event) => { event.preventDefault(); load(status, 1, searchInput.trim()); }}><label><Search /><input autoComplete="off" aria-label="جست‌وجوی کارها" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label><button className="button button-secondary">جست‌وجو</button></form></div>
      {error && <p className="task-archive-error" role="alert">{error}</p>}
      {loadError ? <ErrorState /> : loading ? <div className="task-archive-loading"><LoaderCircle className="spinning" />در حال دریافت...</div> : tasks.length === 0 ? <EmptyState title={search ? "کاری پیدا نشد" : status === "pending" ? "کار انجام‌نشده‌ای وجود ندارد" : "هنوز کاری انجام نشده است"} description={search ? "عبارت جست‌وجو را تغییر دهید." : status === "pending" ? "همه کارهای ثبت‌شده انجام شده‌اند." : "کارهای تیک‌خورده در این بخش قرار می‌گیرند."} /> : <div className="task-archive-list">{tasks.map((task) => <article key={task.id}><button className={`task-check ${status === "completed" ? "checked" : ""}`} onClick={() => toggleTask(task)} disabled={changingId === task.id} aria-label={status === "pending" ? `انجام شد: ${task.title}` : `بازگرداندن: ${task.title}`}>{changingId === task.id ? <LoaderCircle className="spinning" /> : status === "pending" ? <Circle /> : <Check />}</button><div><strong>{task.title}</strong><small>{formatDate(task.task_date)}</small></div><span>{status === "pending" ? "در انتظار انجام" : <><RotateCcw /> امکان بازگرداندن</>}</span></article>)}</div>}
      <footer className="task-archive-pagination"><span>{count.toLocaleString("fa-IR")} کار</span><div><button onClick={() => load(status, page - 1, search)} disabled={page <= 1 || loading}><ChevronRight /></button><em>صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</em><button onClick={() => load(status, page + 1, search)} disabled={page >= pageCount || loading}><ChevronLeft /></button></div></footer>
    </section>
  </div></div>;
}
