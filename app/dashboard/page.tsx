import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "داشبورد" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [{ data: reports }, { data: employees }, { data: tasks }] = await Promise.all([
    supabase.from("daily_reports").select("id, employee_id, report_date, work_summary, status, submitted_at").order("report_date", { ascending: false }).order("submitted_at", { ascending: false }).limit(50),
    supabase.from("employees").select("id, full_name"),
    supabase.from("daily_tasks").select("id, title, task_date, created_by, completed_by, completed_at, created_at").eq("task_date", today).order("created_at"),
  ]);
  const names = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const items = (reports ?? []).map((report) => ({ ...report, employeeName: names.get(report.employee_id) ?? viewer.displayName }));
  return <AppShell viewer={viewer}><DashboardView reports={items} tasks={tasks ?? []} today={today} /></AppShell>;
}
