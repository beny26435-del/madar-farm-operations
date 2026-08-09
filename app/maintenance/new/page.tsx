import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaintenanceIntakeForm } from "@/components/maintenance-intake-form";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "ثبت تعمیرات" };
export const dynamic = "force-dynamic";

export default async function NewMaintenancePage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "maintenance-report:write")) redirect("/dashboard");
  const admin = createAdminClient();
  const { data: customers } = await admin.from("customers").select("id, full_name, phone").order("full_name");
  return <AppShell viewer={viewer}><MaintenanceIntakeForm customers={customers ?? []} canViewCustomers={hasPermission(viewer.role, "customers:view")} /></AppShell>;
}
