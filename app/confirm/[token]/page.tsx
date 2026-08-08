import type { Metadata } from "next";
import { CustomerConfirmationView } from "@/components/customer-confirmation-view";
import { hashCustomerConfirmationToken, isCustomerConfirmationExpired, isCustomerConfirmationToken } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "تأیید تحویل", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isCustomerConfirmationToken(token)) return <CustomerConfirmationView token={token} confirmation={null} />;
  const admin = createAdminClient();
  const { data: confirmation } = await admin.from("customer_handover_confirmations").select("item_id, type, expires_at, confirmed_at, created_at").eq("token_hash", hashCustomerConfirmationToken(token)).maybeSingle();
  if (!confirmation) return <CustomerConfirmationView token={token} confirmation={null} />;
  const { data: item } = await admin.from("customer_repair_items").select("id, customer_id, item_name, details, received_at, delivered_at").eq("id", confirmation.item_id).maybeSingle();
  if (!item) return <CustomerConfirmationView token={token} confirmation={null} />;
  const { data: customer } = await admin.from("customers").select("full_name").eq("id", item.customer_id).maybeSingle();
  return <CustomerConfirmationView token={token} confirmation={{ type: confirmation.type, expiresAt: confirmation.expires_at, confirmedAt: confirmation.confirmed_at, requestedAt: confirmation.created_at, expired: !confirmation.confirmed_at && isCustomerConfirmationExpired(confirmation.expires_at), customerName: customer?.full_name ?? "مشتری", itemName: item.item_name, details: item.details, receivedAt: item.received_at, deliveredAt: item.delivered_at }} />;
}
