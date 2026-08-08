import type { Metadata } from "next";
import { ProtectedAppShell } from "@/components/protected-app-shell";
import { ReportWizard } from "@/components/report-wizard";
export const metadata: Metadata = { title: "ثبت گزارش تعمیرات" };
export const dynamic = "force-dynamic";
export default function NewMaintenancePage() { return <ProtectedAppShell><ReportWizard type="maintenance" /></ProtectedAppShell>; }
