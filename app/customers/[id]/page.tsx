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
    supabase.from("customer_repair_items").select("id, customer_id, item_name, details, status, received_at, delivered_at").eq("customer_id", id).order("received_at", { ascending: false }),
  ]);
  if (!customer) notFound();
  return <AppShell viewer={viewer}><CustomerDetailView customer={customer} items={items ?? []} loadError={Boolean(error)} /></AppShell>;
}
