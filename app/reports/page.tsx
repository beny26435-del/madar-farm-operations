import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReportsReviewView, type ReviewReportItem } from "@/components/reports-review-view";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "بررسی گزارش‌ها" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "reports:review")) redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: daily, error: dailyError }, { data: maintenance, error: maintenanceError }, { data: employees }, { data: reviews }, { data: profiles }, { data: collaborators }] = await Promise.all([
    supabase.from("daily_reports").select("id, employee_id, report_date, start_time, end_time, location, work_summary, issues, actions_taken, notes, status, submitted_at").order("report_date", { ascending: false }),
    supabase.from("maintenance_reports").select("id, reporter_employee_id, report_date, location, title, description, work_status, status, submitted_at").order("report_date", { ascending: false }),
    supabase.from("employees").select("id, full_name"),
    supabase.from("report_reviews").select("id, report_type, report_id, reviewer_id, action, comment, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name"),
    supabase.from("daily_report_collaborators").select("daily_report_id, employee_id").order("created_at"),
  ]);
  const employeeNames = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const profileNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const collaboratorNames = new Map<string, string[]>();
  for (const collaborator of collaborators ?? []) {
    const current = collaboratorNames.get(collaborator.daily_report_id) ?? [];
    current.push(employeeNames.get(collaborator.employee_id) ?? "همکار");
    collaboratorNames.set(collaborator.daily_report_id, current);
  }
  const reviewMap = new Map<string, ReviewReportItem["reviews"]>();
  for (const review of reviews ?? []) {
    const key = `${review.report_type}:${review.report_id}`;
    const current = reviewMap.get(key) ?? [];
    current.push({ ...review, reviewerName: profileNames.get(review.reviewer_id) ?? "مدیر" });
    reviewMap.set(key, current);
  }
  const dailyItems: ReviewReportItem[] = (daily ?? []).map((report) => ({
    id: report.id, type: "daily", authorName: employeeNames.get(report.employee_id) ?? "کارمند", reportDate: report.report_date,
    title: report.work_summary, description: report.work_summary, status: report.status, submittedAt: report.submitted_at,
    meta: [report.location ? `محل کار: ${report.location}` : null, collaboratorNames.get(report.id)?.length ? `همراهان: ${collaboratorNames.get(report.id)?.join("، ")}` : null, report.start_time && report.end_time ? `${report.start_time.slice(0, 5)} تا ${report.end_time.slice(0, 5)}` : null, report.issues ? `مشکلات: ${report.issues}` : null, report.actions_taken ? `اقدامات: ${report.actions_taken}` : null, report.notes].filter((value): value is string => Boolean(value)),
    reviews: reviewMap.get(`daily:${report.id}`) ?? [],
  }));
  const maintenanceItems: ReviewReportItem[] = (maintenance ?? []).map((report) => ({
    id: report.id, type: "maintenance", authorName: employeeNames.get(report.reporter_employee_id) ?? "کارمند", reportDate: report.report_date,
    title: report.title, description: report.description, status: report.status, submittedAt: report.submitted_at,
    meta: [report.location, report.work_status === "completed" ? "تکمیل‌شده" : report.work_status === "needs_follow_up" ? "نیازمند پیگیری" : "در انتظار انجام"],
    reviews: reviewMap.get(`maintenance:${report.id}`) ?? [],
  }));
  const reports = [...dailyItems, ...maintenanceItems].sort((a, b) => (b.submittedAt ?? b.reportDate).localeCompare(a.submittedAt ?? a.reportDate));
  return <AppShell viewer={viewer}><ReportsReviewView reports={reports} loadError={Boolean(dailyError || maintenanceError)} /></AppShell>;
}
