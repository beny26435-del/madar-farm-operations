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
  const [{ data: reports }, { data: employees }] = await Promise.all([
    supabase.from("daily_reports").select("id, employee_id, report_date, work_summary, status, submitted_at").order("report_date", { ascending: false }).order("submitted_at", { ascending: false }).limit(50),
    supabase.from("employees").select("id, full_name"),
  ]);
  const names = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const items = (reports ?? []).map((report) => ({ ...report, employeeName: names.get(report.employee_id) ?? viewer.displayName }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <AppShell viewer={viewer}><DashboardView reports={items} today={today} /></AppShell>;
}
