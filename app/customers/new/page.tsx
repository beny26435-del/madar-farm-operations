import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CustomerCreateForm } from "@/components/customer-create-form";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "افزودن مشتری" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "customers:manage")) redirect("/dashboard");
  return <AppShell viewer={viewer}><CustomerCreateForm /></AppShell>;
}
