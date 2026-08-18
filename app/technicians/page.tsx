import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TechnicianJobsView, type TechnicianJob } from "@/components/technician-jobs-view";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "تحویل به تعمیرکار" };
export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "technician-jobs:manage")) redirect("/dashboard");
  const admin = createAdminClient();
  const [{ data: jobs, error }, { data: items }] = await Promise.all([
    admin.from("technician_jobs").select("id, repair_item_id, technician_name, item_name, customer_name, quantity, status, handed_over_at, returned_at, created_at").order("created_at", { ascending: false }),
    admin.from("customer_repair_items").select("id, customer_id, item_name, quantity, status").eq("status", "received").order("received_at", { ascending: false }),
  ]);
  const customerIds = [...new Set((items ?? []).map((item) => item.customer_id))];
  const { data: customers } = customerIds.length ? await admin.from("customers").select("id, full_name").in("id", customerIds) : { data: [] };
  const customerNames = new Map((customers ?? []).map((customer) => [customer.id, customer.full_name]));
  const assigned = new Map<string, number>();
  for (const job of jobs ?? []) if (job.status !== "returned") assigned.set(job.repair_item_id, (assigned.get(job.repair_item_id) ?? 0) + job.quantity);
  const devices = (items ?? []).map((item) => ({ id: item.id, itemName: item.item_name, customerName: customerNames.get(item.customer_id) ?? "مشتری", availableQuantity: Math.max(0, item.quantity - (assigned.get(item.id) ?? 0)) })).filter((item) => item.availableQuantity > 0);
  return <AppShell viewer={viewer}><TechnicianJobsView initialJobs={(jobs ?? []) as TechnicianJob[]} devices={devices} loadError={Boolean(error)} /></AppShell>;
}
