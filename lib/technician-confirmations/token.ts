import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type TechnicianConfirmationType = "handover" | "return" | "rework";

export function hashTechnicianConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isTechnicianConfirmationToken(token: string) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

export function isTechnicianConfirmationExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function createTechnicianConfirmationToken(origin: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  return {
    tokenHash: hashTechnicianConfirmationToken(token),
    expiresAt,
    url: new URL(`/technician-confirm/${token}`, origin).toString(),
  };
}

export async function issueTechnicianConfirmation(input: { jobId: string; type: TechnicianConfirmationType; createdBy: string; origin: string }) {
  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin.from("technician_job_confirmations").select("id, confirmed_at").eq("job_id", input.jobId).eq("type", input.type).is("confirmed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw lookupError;
  const token = createTechnicianConfirmationToken(input.origin);
  const issuedAt = new Date().toISOString();
  const values = {
    job_id: input.jobId,
    type: input.type,
    token_hash: token.tokenHash,
    expires_at: token.expiresAt,
    created_by: input.createdBy,
    created_at: issuedAt,
  };
  const result = existing
    ? await admin.from("technician_job_confirmations").update({ token_hash: values.token_hash, expires_at: values.expires_at, created_at: values.created_at }).eq("id", existing.id)
    : await admin.from("technician_job_confirmations").insert(values);
  if (result.error) throw result.error;

  return { status: "issued" as const, url: token.url, expiresAt: values.expires_at, jobId: input.jobId };
}

export async function issuePartialTechnicianRework(input: { jobId: string; quantity: number; createdBy: string; origin: string }) {
  const admin = createAdminClient();
  const { data: source, error: sourceError } = await admin.from("technician_jobs")
    .select("id, repair_item_id, technician_name, item_name, customer_name, quantity, status, created_by, rework_count, last_reworked_at")
    .eq("id", input.jobId)
    .single();
  if (sourceError || !source) throw sourceError ?? new Error("ارجاع پیدا نشد.");
  if (source.status === "awaiting_rework") {
    if (input.quantity !== source.quantity) throw new Error("تعداد لینک در انتظار قابل تغییر نیست.");
    return issueTechnicianConfirmation({ jobId: source.id, type: "rework", createdBy: input.createdBy, origin: input.origin });
  }
  if (source.status !== "returned" || input.quantity < 1 || input.quantity > source.quantity) throw new Error("تعداد مرجوعی معتبر نیست.");

  if (input.quantity === source.quantity) {
    const { data: prepared, error: prepareError } = await admin.from("technician_jobs").update({ status: "awaiting_rework" }).eq("id", source.id).eq("status", "returned").eq("quantity", source.quantity).select("id").maybeSingle();
    if (prepareError || !prepared) throw prepareError ?? new Error("وضعیت ارجاع هم‌زمان تغییر کرده است.");
    try {
      return await issueTechnicianConfirmation({ jobId: source.id, type: "rework", createdBy: input.createdBy, origin: input.origin });
    } catch (error) {
      await admin.from("technician_jobs").update({ status: "returned" }).eq("id", source.id).eq("status", "awaiting_rework");
      throw error;
    }
  }

  const remainingQuantity = source.quantity - input.quantity;
  const { data: reduced, error: reduceError } = await admin.from("technician_jobs").update({ quantity: remainingQuantity }).eq("id", source.id).eq("status", "returned").eq("quantity", source.quantity).select("id").maybeSingle();
  if (reduceError || !reduced) throw reduceError ?? new Error("تعداد ارجاع هم‌زمان تغییر کرده است.");
  const { data: splitJob, error: splitError } = await admin.from("technician_jobs").insert({
    repair_item_id: source.repair_item_id,
    technician_name: source.technician_name,
    item_name: source.item_name,
    customer_name: source.customer_name,
    quantity: input.quantity,
    status: "awaiting_rework",
    created_by: source.created_by,
    rework_count: source.rework_count,
    last_reworked_at: source.last_reworked_at,
  }).select("id").single();
  if (splitError || !splitJob) {
    await admin.from("technician_jobs").update({ quantity: source.quantity }).eq("id", source.id).eq("status", "returned").eq("quantity", remainingQuantity);
    throw splitError ?? new Error("جداسازی تعداد مرجوعی انجام نشد.");
  }
  try {
    return await issueTechnicianConfirmation({ jobId: splitJob.id, type: "rework", createdBy: input.createdBy, origin: input.origin });
  } catch (error) {
    await admin.from("technician_jobs").delete().eq("id", splitJob.id).eq("status", "awaiting_rework");
    await admin.from("technician_jobs").update({ quantity: source.quantity }).eq("id", source.id).eq("status", "returned").eq("quantity", remainingQuantity);
    throw error;
  }
}
