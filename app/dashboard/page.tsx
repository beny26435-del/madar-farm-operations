import type { Metadata } from "next";
import { ProtectedAppShell } from "@/components/protected-app-shell";
import { DashboardView } from "@/components/dashboard-view";

export const metadata: Metadata = { title: "داشبورد" };
export const dynamic = "force-dynamic";

export default function DashboardPage() { return <ProtectedAppShell><DashboardView /></ProtectedAppShell>; }
