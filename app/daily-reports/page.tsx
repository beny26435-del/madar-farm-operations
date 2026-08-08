import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ReportListView } from "@/components/report-list-view";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "گزارش‌های روزانه" };
export const dynamic = "force-dynamic";
export default async function DailyReportsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: reports, error }, { data: employees }, { data: expenses }] = await Promise.all([
    supabase.from("daily_reports").select("id, employee_id, report_date, start_time, end_time, work_summary, status, submitted_at").order("report_date", { ascending: false }).order("submitted_at", { ascending: false }),
    supabase.from("employees").select("id, full_name"),
    supabase.from("daily_report_expenses").select("id, daily_report_id, description, amount, invoice_path").order("created_at", { ascending: true }),
  ]);
  const names = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]));
  const invoicePaths = (expenses ?? []).flatMap((expense) => expense.invoice_path ? [expense.invoice_path] : []);
  const invoiceUrls = new Map<string, string>();
  if (invoicePaths.length > 0) {
    const admin = createAdminClient();
    await Promise.all(invoicePaths.map(async (path) => {
      const { data } = await admin.storage.from("report-invoices").createSignedUrl(path, 3600);
      if (data?.signedUrl) invoiceUrls.set(path, data.signedUrl);
    }));
  }
  const expensesByReport = new Map<string, Array<{ id: string; description: string; amount: number; invoiceUrl: string | null }>>();
  for (const expense of expenses ?? []) {
    const current = expensesByReport.get(expense.daily_report_id) ?? [];
    current.push({ id: expense.id, description: expense.description, amount: expense.amount, invoiceUrl: expense.invoice_path ? invoiceUrls.get(expense.invoice_path) ?? null : null });
    expensesByReport.set(expense.daily_report_id, current);
  }
  const items = (reports ?? []).map((report) => ({ ...report, employeeName: names.get(report.employee_id) ?? viewer.displayName, expenses: expensesByReport.get(report.id) ?? [] }));
  return <AppShell viewer={viewer}><ReportListView type="daily" reports={items} loadError={Boolean(error)} /></AppShell>;
}
