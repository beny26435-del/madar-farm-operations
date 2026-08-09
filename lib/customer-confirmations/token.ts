import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerConfirmationType = "intake" | "delivery";

export function hashCustomerConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isCustomerConfirmationToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

export function isCustomerConfirmationExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function issueCustomerConfirmation(input: { itemId?: string; intakeId?: string; type: CustomerConfirmationType; createdBy: string; origin: string }) {
  if (Boolean(input.itemId) === Boolean(input.intakeId)) throw new Error("یک مقصد برای تأیید لازم است.");
  const admin = createAdminClient();
  let lookup = admin.from("customer_handover_confirmations").select("id, confirmed_at").eq("type", input.type);
  lookup = input.itemId ? lookup.eq("item_id", input.itemId) : lookup.eq("intake_id", input.intakeId!);
  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.confirmed_at) return { status: "already_confirmed" as const };

  const token = randomBytes(32).toString("base64url");
  const issuedAt = new Date().toISOString();
  const values = {
    item_id: input.itemId ?? null,
    intake_id: input.intakeId ?? null,
    type: input.type,
    token_hash: hashCustomerConfirmationToken(token),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: input.createdBy,
    created_at: issuedAt,
  };
  const result = existing
    ? await admin.from("customer_handover_confirmations").update({ token_hash: values.token_hash, expires_at: values.expires_at, created_at: values.created_at }).eq("id", existing.id)
    : await admin.from("customer_handover_confirmations").insert(values);
  if (result.error) throw result.error;

  return { status: "issued" as const, url: new URL(`/confirm/${token}`, input.origin).toString(), expiresAt: values.expires_at };
}
