import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CustomerDetailView } from "@/components/customer-detail-view";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "پرونده مشتری" };
export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "customers:view")) redirect("/dashboard");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: customer }, { data: items, error }] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone, created_at").eq("id", id).maybeSingle(),
    supabase.from("customer_repair_items").select("id, customer_id, intake_id, item_name, quantity, status, received_at, delivered_at").eq("customer_id", id).order("received_at", { ascending: false }),
  ]);
  if (!customer) notFound();
  const itemIds = (items ?? []).map((item) => item.id);
  const intakeIds = [...new Set((items ?? []).flatMap((item) => item.intake_id ? [item.intake_id] : []))];
  const [itemConfirmations, intakeConfirmations] = await Promise.all([
    itemIds.length ? supabase.from("customer_handover_confirmations").select("id, item_id, intake_id, type, expires_at, confirmed_at").in("item_id", itemIds) : Promise.resolve({ data: [], error: null }),
    intakeIds.length ? supabase.from("customer_handover_confirmations").select("id, item_id, intake_id, type, expires_at, confirmed_at").in("intake_id", intakeIds) : Promise.resolve({ data: [], error: null }),
  ]);
  return <AppShell viewer={viewer}><CustomerDetailView customer={customer} items={items ?? []} confirmations={[...(itemConfirmations.data ?? []), ...(intakeConfirmations.data ?? [])]} loadError={Boolean(error || itemConfirmations.error || intakeConfirmations.error)} /></AppShell>;
}
