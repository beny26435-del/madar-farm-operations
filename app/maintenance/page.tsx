import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaintenanceIntakeListView, type MaintenanceIntake } from "@/components/maintenance-intake-list-view";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "تعمیرات و سرویس" };
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "maintenance-report:write")) redirect("/dashboard");
  const admin = createAdminClient();
  let intakeQuery = admin.from("customer_repair_intakes").select("id, customer_id, received_at").order("received_at", { ascending: false });
  if (viewer.role === "employee") intakeQuery = intakeQuery.eq("created_by", viewer.id);
  const { data: intakeRows, error } = await intakeQuery;
  const intakeIds = (intakeRows ?? []).map((intake) => intake.id);
  const customerIds = [...new Set((intakeRows ?? []).map((intake) => intake.customer_id))];
  const [{ data: customers }, { data: items }, { data: confirmations }] = await Promise.all([
    customerIds.length ? admin.from("customers").select("id, full_name").in("id", customerIds) : Promise.resolve({ data: [] }),
    intakeIds.length ? admin.from("customer_repair_items").select("intake_id, item_name, quantity, photo_path, status").in("intake_id", intakeIds).order("created_at") : Promise.resolve({ data: [] }),
    intakeIds.length ? admin.from("customer_handover_confirmations").select("intake_id, confirmed_at").eq("type", "intake").in("intake_id", intakeIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((customers ?? []).map((customer) => [customer.id, customer.full_name]));
  const confirmed = new Map((confirmations ?? []).map((confirmation) => [confirmation.intake_id, confirmation.confirmed_at]));
  const result: MaintenanceIntake[] = (intakeRows ?? []).map((intake) => ({
    id: intake.id,
    customerId: intake.customer_id,
    customerName: names.get(intake.customer_id) ?? "مشتری",
    receivedAt: intake.received_at,
    confirmedAt: confirmed.get(intake.id) ?? null,
    items: (items ?? []).filter((item) => item.intake_id === intake.id).map((item) => ({ name: item.item_name, quantity: item.quantity, status: item.status, photoUrl: item.photo_path ? admin.storage.from("repair-item-photos").getPublicUrl(item.photo_path).data.publicUrl : null })),
  }));
  return <AppShell viewer={viewer}><MaintenanceIntakeListView intakes={result} loadError={Boolean(error)} canViewCustomers={hasPermission(viewer.role, "customers:view")} /></AppShell>;
}
