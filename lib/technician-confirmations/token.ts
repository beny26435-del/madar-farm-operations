import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type TechnicianConfirmationType = "handover" | "return";

export function hashTechnicianConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isTechnicianConfirmationToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

export function isTechnicianConfirmationExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function issueTechnicianConfirmation(input: { jobId: string; type: TechnicianConfirmationType; createdBy: string; origin: string }) {
  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin.from("technician_job_confirmations").select("id, confirmed_at").eq("job_id", input.jobId).eq("type", input.type).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.confirmed_at) return { status: "already_confirmed" as const };

  const token = randomBytes(32).toString("base64url");
  const issuedAt = new Date().toISOString();
  const values = {
    job_id: input.jobId,
    type: input.type,
    token_hash: hashTechnicianConfirmationToken(token),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: input.createdBy,
    created_at: issuedAt,
  };
  const result = existing
    ? await admin.from("technician_job_confirmations").update({ token_hash: values.token_hash, expires_at: values.expires_at, created_at: values.created_at }).eq("id", existing.id)
    : await admin.from("technician_job_confirmations").insert(values);
  if (result.error) throw result.error;

  return { status: "issued" as const, url: new URL(`/technician-confirm/${token}`, input.origin).toString(), expiresAt: values.expires_at };
}
