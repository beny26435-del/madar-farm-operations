import type { Metadata } from "next";
import { ProtectedAppShell } from "@/components/protected-app-shell";
import { ReportListView } from "@/components/report-list-view";

export const metadata: Metadata = { title: "گزارش‌های روزانه" };
export const dynamic = "force-dynamic";
export default function DailyReportsPage() { return <ProtectedAppShell><ReportListView type="daily" /></ProtectedAppShell>; }
