import type { Metadata } from "next";
import { ProtectedAppShell } from "@/components/protected-app-shell";
import { ReportListView } from "@/components/report-list-view";

export const metadata: Metadata = { title: "تعمیرات و سرویس" };
export const dynamic = "force-dynamic";
export default function MaintenancePage() { return <ProtectedAppShell><ReportListView type="maintenance" /></ProtectedAppShell>; }
