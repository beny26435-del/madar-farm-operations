import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CustomersView } from "@/components/customers-view";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مشتریان" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "customers:view")) redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: customers, error }, { data: items }] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
    supabase.from("customer_repair_items").select("customer_id, status, received_at"),
  ]);
  const counts = new Map<string, { received: number; delivered: number; latest: string | null }>();
  for (const item of items ?? []) {
    const current = counts.get(item.customer_id) ?? { received: 0, delivered: 0, latest: null };
    current[item.status] += 1;
    if (!current.latest || item.received_at > current.latest) current.latest = item.received_at;
    counts.set(item.customer_id, current);
  }
  const customerItems = (customers ?? []).map((customer) => ({ ...customer, ...(counts.get(customer.id) ?? { received: 0, delivered: 0, latest: null }) }));
  return <AppShell viewer={viewer}><CustomersView customers={customerItems} loadError={Boolean(error)} /></AppShell>;
}
