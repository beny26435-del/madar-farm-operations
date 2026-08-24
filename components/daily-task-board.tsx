"use client";

import { Check, CheckCircle2, Circle, ListTodo, LoaderCircle, Plus, RefreshCcw, RotateCcw } from "lucide-react";
import { useState } from "react";

export type DailyTask = {
  id: string;
  title: string;
  task_date: string;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
};

export function DailyTaskBoard({ initialTasks, showCompleted = true }: { initialTasks: DailyTask[]; showCompleted?: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingTasks = tasks.filter((task) => !task.completed_at);
  const completedTasks = tasks.filter((task) => task.completed_at).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  async function refreshTasks() {
    setRefreshing(true); setError(null);
    try {
      const response = await fetch("/api/daily-tasks", { cache: "no-store" });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { tasks?: DailyTask[]; message?: string };
      if (!response.ok || !result.tasks) { setError(result.message ?? "دریافت فهرست انجام نشد."); return; }
      setTasks(result.tasks);
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setRefreshing(false); }
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) { setError("عنوان کار را کامل وارد کنید."); return; }
    setAdding(true); setError(null);
    try {
      const response = await fetch("/api/daily-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { task?: DailyTask; message?: string };
      if (!response.ok || !result.task) { setError(result.message ?? "افزودن کار انجام نشد."); return; }
      setTasks((current) => [...current, result.task!]);
      setTitle("");
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setAdding(false); }
  }

  async function toggleTask(task: DailyTask) {
    setChangingId(task.id); setError(null);
    try {
      const response = await fetch("/api/daily-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed: !task.completed_at }) });
      const result = await response.json().catch(() => ({ message: "پاسخ سرور معتبر نیست." })) as { task?: DailyTask; message?: string };
      if (!response.ok || !result.task) { setError(result.message ?? "تغییر وضعیت کار انجام نشد."); return; }
      setTasks((current) => current.map((item) => item.id === task.id ? result.task! : item));
    } catch { setError("ارتباط با سامانه برقرار نشد."); } finally { setChangingId(null); }
  }

  return <section className="surface daily-task-board">
    <header><div className="daily-task-heading"><span><ListTodo /></span><div><h2>کارهای باز</h2><p>همه کارهای انجام‌نشده برای اعضای تیم نمایش داده می‌شوند.</p></div></div><button type="button" className="task-refresh" onClick={refreshTasks} disabled={refreshing} aria-label="به‌روزرسانی کارها"><RefreshCcw className={refreshing ? "spinning" : ""} />به‌روزرسانی</button></header>
    <form className="daily-task-add" onSubmit={addTask}><label htmlFor="new-daily-task">کار جدید</label><div><input id="new-daily-task" className="input" autoComplete="off" value={title} onChange={(event) => { setTitle(event.target.value); setError(null); }} /><button className="button button-primary" disabled={adding}><Plus />{adding ? "در حال افزودن..." : "افزودن"}</button></div></form>
    {error && <p className="daily-task-error" role="alert">{error}</p>}
    <div className={`daily-task-columns ${showCompleted ? "" : "pending-only"}`}>
      <section><header><div><Circle /><strong>در حال انجام</strong></div><span>{pendingTasks.length.toLocaleString("fa-IR")}</span></header>{pendingTasks.length ? <div className="daily-task-list">{pendingTasks.map((task) => <article key={task.id}><button type="button" className="task-check" aria-label={`انجام شد: ${task.title}`} onClick={() => toggleTask(task)} disabled={changingId === task.id}>{changingId === task.id ? <LoaderCircle className="spinning" /> : <Circle />}</button><strong>{task.title}</strong><small>در انتظار انجام</small></article>)}</div> : <div className="daily-task-empty"><CheckCircle2 /><strong>کاری باقی نمانده است</strong><span>همه کارهای ثبت‌شده انجام شده‌اند.</span></div>}</section>
      {showCompleted && <section className="completed-tasks"><header><div><CheckCircle2 /><strong>انجام‌شده</strong></div><span>{completedTasks.length.toLocaleString("fa-IR")}</span></header>{completedTasks.length ? <div className="daily-task-list">{completedTasks.map((task) => <article key={task.id}><button type="button" className="task-check checked" aria-label={`بازگرداندن: ${task.title}`} onClick={() => toggleTask(task)} disabled={changingId === task.id}>{changingId === task.id ? <LoaderCircle className="spinning" /> : <Check />}</button><strong>{task.title}</strong><small><RotateCcw /> با برداشتن تیک به فهرست برمی‌گردد</small></article>)}</div> : <div className="daily-task-empty"><ListTodo /><strong>هنوز کاری تمام نشده</strong><span>کارهای تیک‌خورده اینجا قرار می‌گیرند.</span></div>}</section>}
    </div>
  </section>;
}
