import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ReportListView } from "@/components/report-list-view";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "گزارش‌های روزانه" };
export const dynamic = "force-dynamic";
export default async function DailyReportsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: reports, error }, { data: employees }] = await Promise.all([
    supabase.from("daily_reports").select("id, employee_id, report_date, start_time, end_time, work_summary, status, submitted_at").order("report_date", { ascending: false }).order("submitted_at", { ascending: false }),
    supabase.from("employees").select("id, full_name"),
  ]);
  const names = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const items = (reports ?? []).map((report) => ({ ...report, employeeName: names.get(report.employee_id) ?? viewer.displayName }));
  return <AppShell viewer={viewer}><ReportListView type="daily" reports={items} loadError={Boolean(error)} /></AppShell>;
}
