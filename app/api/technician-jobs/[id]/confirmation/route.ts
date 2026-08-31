import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { issuePartialTechnicianRework, issueTechnicianConfirmation } from "@/lib/technician-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  type: z.enum(["handover", "return", "rework"]),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
}).refine((value) => value.type !== "rework" || value.quantity !== undefined, { message: "تعداد مرجوعی لازم است." });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ message: "ارجاع معتبر نیست." }, { status: 400 });
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const admin = createAdminClient();
  const { data: actor } = await admin.from("profiles").select("is_active, role").eq("id", actorId).maybeSingle();
  if (!actor?.is_active) return NextResponse.json({ message: "اجازه ساخت لینک را ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نوع تأیید معتبر نیست." }, { status: 400 });

  const { data: job } = await admin.from("technician_jobs").select("id, technician_name, item_name, customer_name, quantity, status, created_by").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ message: "ارجاع پیدا نشد." }, { status: 404 });
  if (actor.role !== "admin" && job.created_by !== actorId) return NextResponse.json({ message: "فقط ثبت‌کننده این ارجاع یا میلاد می‌تواند لینک آن را بسازد." }, { status: 403 });
  const expectedStatus = parsed.data.type === "handover" ? "awaiting_handover" : parsed.data.type === "return" ? "with_technician" : "returned";
  const alreadyWaiting = (parsed.data.type === "return" && job.status === "awaiting_return") || (parsed.data.type === "rework" && job.status === "awaiting_rework");
  if (job.status !== expectedStatus && !alreadyWaiting) {
    const message = parsed.data.type === "handover" ? "تحویل این دستگاه قبلاً تأیید شده است." : parsed.data.type === "return" ? "امکان ساخت لینک تحویل از تعمیرکار در این وضعیت وجود ندارد." : "فقط دستگاهی که از تعمیرکار تحویل گرفته‌اید قابل مرجوع کردن است.";
    return NextResponse.json({ message }, { status: 409 });
  }
  if (parsed.data.type === "rework" && parsed.data.quantity! > job.quantity) {
    return NextResponse.json({ message: "تعداد مرجوعی بیشتر از تعداد این ارجاع است." }, { status: 409 });
  }
  if (parsed.data.type === "rework" && job.status === "awaiting_rework" && parsed.data.quantity !== job.quantity) {
    return NextResponse.json({ message: "تعداد این لینک قبلاً مشخص شده است؛ برای ارسال دوباره همان تعداد را بفرستید." }, { status: 409 });
  }

  let previousStatus: "with_technician" | "returned" | null = null;
  if (parsed.data.type === "return" && job.status === "with_technician") {
    const { error } = await admin.from("technician_jobs").update({ status: "awaiting_return" }).eq("id", id).eq("status", "with_technician");
    if (error) return NextResponse.json({ message: "آماده‌سازی لینک تحویل از تعمیرکار انجام نشد." }, { status: 500 });
    previousStatus = "with_technician";
  }

  try {
    const confirmation = parsed.data.type === "rework"
      ? await issuePartialTechnicianRework({ jobId: id, quantity: parsed.data.quantity!, createdBy: actorId, origin: new URL(request.url).origin })
      : await issueTechnicianConfirmation({ jobId: id, type: parsed.data.type, createdBy: actorId, origin: new URL(request.url).origin });
    const { data: updatedJob } = await admin.from("technician_jobs").select("id, repair_item_id, technician_name, item_name, customer_name, quantity, status, rework_count, promised_return_at, handed_over_at, returned_at, last_reworked_at, created_at").eq("id", confirmation.jobId).single();
    await recordActivity({ actorId, action: `technician_link.${parsed.data.type}`, entityType: "technician_job", entityId: confirmation.jobId, metadata: { technician_name: job.technician_name, item_name: job.item_name, quantity: parsed.data.type === "rework" ? parsed.data.quantity : job.quantity } });
    return NextResponse.json({ confirmationUrl: confirmation.url, expiresAt: confirmation.expiresAt, job: updatedJob, sourceJobId: id, remainingQuantity: parsed.data.type === "rework" ? job.quantity - parsed.data.quantity! : undefined, message: "لینک تأیید آماده است." });
  } catch {
    if (previousStatus === "with_technician") await admin.from("technician_jobs").update({ status: "with_technician" }).eq("id", id).eq("status", "awaiting_return");
    return NextResponse.json({ message: "ساخت لینک تأیید انجام نشد." }, { status: 500 });
  }
}
