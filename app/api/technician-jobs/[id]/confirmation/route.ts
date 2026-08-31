import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { issueTechnicianConfirmation } from "@/lib/technician-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ type: z.enum(["handover", "return", "rework"]) });

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

  const { data: job } = await admin.from("technician_jobs").select("id, technician_name, item_name, status, created_by").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ message: "ارجاع پیدا نشد." }, { status: 404 });
  if (actor.role !== "admin" && job.created_by !== actorId) return NextResponse.json({ message: "فقط ثبت‌کننده این ارجاع یا میلاد می‌تواند لینک آن را بسازد." }, { status: 403 });
  const expectedStatus = parsed.data.type === "handover" ? "awaiting_handover" : parsed.data.type === "return" ? "with_technician" : "returned";
  const alreadyWaiting = (parsed.data.type === "return" && job.status === "awaiting_return") || (parsed.data.type === "rework" && job.status === "awaiting_rework");
  if (job.status !== expectedStatus && !alreadyWaiting) {
    const message = parsed.data.type === "handover" ? "تحویل این دستگاه قبلاً تأیید شده است." : parsed.data.type === "return" ? "امکان ساخت لینک تحویل از تعمیرکار در این وضعیت وجود ندارد." : "فقط دستگاهی که از تعمیرکار تحویل گرفته‌اید قابل مرجوع کردن است.";
    return NextResponse.json({ message }, { status: 409 });
  }

  let previousStatus: "with_technician" | "returned" | null = null;
  if (parsed.data.type === "return" && job.status === "with_technician") {
    const { error } = await admin.from("technician_jobs").update({ status: "awaiting_return" }).eq("id", id).eq("status", "with_technician");
    if (error) return NextResponse.json({ message: "آماده‌سازی لینک تحویل از تعمیرکار انجام نشد." }, { status: 500 });
    previousStatus = "with_technician";
  } else if (parsed.data.type === "rework" && job.status === "returned") {
    const { error } = await admin.from("technician_jobs").update({ status: "awaiting_rework" }).eq("id", id).eq("status", "returned");
    if (error) return NextResponse.json({ message: "آماده‌سازی لینک مرجوعی انجام نشد." }, { status: 500 });
    previousStatus = "returned";
  }

  try {
    const confirmation = await issueTechnicianConfirmation({ jobId: id, type: parsed.data.type, createdBy: actorId, origin: new URL(request.url).origin });
    await recordActivity({ actorId, action: `technician_link.${parsed.data.type}`, entityType: "technician_job", entityId: id, metadata: { technician_name: job.technician_name, item_name: job.item_name } });
    return NextResponse.json({ confirmationUrl: confirmation.url, expiresAt: confirmation.expiresAt, message: "لینک تأیید آماده است." });
  } catch {
    if (previousStatus === "with_technician") await admin.from("technician_jobs").update({ status: "with_technician" }).eq("id", id).eq("status", "awaiting_return");
    if (previousStatus === "returned") await admin.from("technician_jobs").update({ status: "returned" }).eq("id", id).eq("status", "awaiting_rework");
    return NextResponse.json({ message: "ساخت لینک تأیید انجام نشد." }, { status: 500 });
  }
}
