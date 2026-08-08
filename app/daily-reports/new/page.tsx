import type { Metadata } from "next";
import { ProtectedAppShell } from "@/components/protected-app-shell";
import { ReportWizard } from "@/components/report-wizard";
export const metadata: Metadata = { title: "ثبت گزارش روزانه" };
export const dynamic = "force-dynamic";
export default function NewDailyReportPage() { return <ProtectedAppShell><ReportWizard type="daily" /></ProtectedAppShell>; }
