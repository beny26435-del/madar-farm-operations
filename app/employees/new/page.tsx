import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeeCreateForm } from "@/components/employee-create-form";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "ساخت کاربر" };
export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "employees:manage")) redirect("/dashboard");
  return <AppShell viewer={viewer}><EmployeeCreateForm /></AppShell>;
}
