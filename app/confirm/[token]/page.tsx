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
  const { data: confirmation } = await admin.from("customer_handover_confirmations").select("item_id, intake_id, type, expires_at, confirmed_at, created_at").eq("token_hash", hashCustomerConfirmationToken(token)).maybeSingle();
  if (!confirmation) return <CustomerConfirmationView token={token} confirmation={null} />;
  if (confirmation.intake_id) {
    const [{ data: intake }, { data: items }] = await Promise.all([
      admin.from("customer_repair_intakes").select("customer_id, received_at").eq("id", confirmation.intake_id).maybeSingle(),
      admin.from("customer_repair_items").select("item_name, quantity").eq("intake_id", confirmation.intake_id).order("created_at"),
    ]);
    if (!intake || !items?.length) return <CustomerConfirmationView token={token} confirmation={null} />;
    const { data: customer } = await admin.from("customers").select("full_name").eq("id", intake.customer_id).maybeSingle();
    return <CustomerConfirmationView token={token} confirmation={{ type: confirmation.type, expiresAt: confirmation.expires_at, confirmedAt: confirmation.confirmed_at, requestedAt: confirmation.created_at, expired: !confirmation.confirmed_at && isCustomerConfirmationExpired(confirmation.expires_at), customerName: customer?.full_name ?? "مشتری", items: items.map((item) => ({ name: item.item_name, quantity: item.quantity })), receivedAt: intake.received_at }} />;
  }
  if (!confirmation.item_id) return <CustomerConfirmationView token={token} confirmation={null} />;
  const { data: item } = await admin.from("customer_repair_items").select("customer_id, item_name, quantity, received_at").eq("id", confirmation.item_id).maybeSingle();
  if (!item) return <CustomerConfirmationView token={token} confirmation={null} />;
  const { data: customer } = await admin.from("customers").select("full_name").eq("id", item.customer_id).maybeSingle();
  return <CustomerConfirmationView token={token} confirmation={{ type: confirmation.type, expiresAt: confirmation.expires_at, confirmedAt: confirmation.confirmed_at, requestedAt: confirmation.created_at, expired: !confirmation.confirmed_at && isCustomerConfirmationExpired(confirmation.expires_at), customerName: customer?.full_name ?? "مشتری", items: [{ name: item.item_name, quantity: item.quantity }], receivedAt: item.received_at }} />;
}
