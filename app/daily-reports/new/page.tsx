import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DailyReportForm } from "@/components/daily-report-form";
import { requireViewer } from "@/lib/auth/viewer";
export const metadata: Metadata = { title: "ثبت گزارش روزانه" };
export const dynamic = "force-dynamic";
export default async function NewDailyReportPage() {
  const viewer = await requireViewer();
  return <AppShell viewer={viewer}><DailyReportForm displayName={viewer.displayName} /></AppShell>;
}
