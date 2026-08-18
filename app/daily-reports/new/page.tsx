import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DailyReportForm } from "@/components/daily-report-form";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
export const metadata: Metadata = { title: "ثبت گزارش روزانه" };
export const dynamic = "force-dynamic";
export default async function NewDailyReportPage() {
  const viewer = await requireViewer();
  const admin = createAdminClient();
  const { data: employees } = await admin.from("employees").select("id, full_name, profile_id").eq("status", "active").order("full_name");
  const collaborators = (employees ?? []).filter((employee) => employee.profile_id !== viewer.id || employee.full_name.trim() === "میلاد").map(({ id, full_name }) => ({ id, fullName: full_name }));
  return <AppShell viewer={viewer}><DailyReportForm displayName={viewer.displayName} collaborators={collaborators} /></AppShell>;
}
