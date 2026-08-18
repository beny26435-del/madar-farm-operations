import type { Metadata } from "next";
import { TechnicianConfirmationView } from "@/components/technician-confirmation-view";
import { hashTechnicianConfirmationToken, isTechnicianConfirmationExpired, isTechnicianConfirmationToken } from "@/lib/technician-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "تأیید تحویل تعمیرکار", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TechnicianConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isTechnicianConfirmationToken(token)) return <TechnicianConfirmationView token={token} confirmation={null} />;
  const admin = createAdminClient();
  const { data: confirmation } = await admin.from("technician_job_confirmations").select("job_id, type, expires_at, confirmed_at, created_at").eq("token_hash", hashTechnicianConfirmationToken(token)).maybeSingle();
  if (!confirmation) return <TechnicianConfirmationView token={token} confirmation={null} />;
  const { data: job } = await admin.from("technician_jobs").select("technician_name, item_name, customer_name, quantity").eq("id", confirmation.job_id).maybeSingle();
  if (!job) return <TechnicianConfirmationView token={token} confirmation={null} />;
  return <TechnicianConfirmationView token={token} confirmation={{ type: confirmation.type, expiresAt: confirmation.expires_at, confirmedAt: confirmation.confirmed_at, requestedAt: confirmation.created_at, expired: !confirmation.confirmed_at && isTechnicianConfirmationExpired(confirmation.expires_at), ...job }} />;
}
