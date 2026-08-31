import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { hashTechnicianConfirmationToken, isTechnicianConfirmationToken } from "@/lib/technician-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ promisedReturnAt: z.string().datetime().nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!isTechnicianConfirmationToken(token)) return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "زمان تحویل معتبر نیست." }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_technician_handover", { p_token_hash: hashTechnicianConfirmationToken(token), p_promised_return_at: parsed.data.promisedReturnAt ?? null });
  if (error || !data?.[0]) return NextResponse.json({ message: "ثبت تأیید انجام نشد." }, { status: 500 });
  const result = data[0];
  if (result.result === "invalid") return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  if (result.result === "expired") return NextResponse.json({ message: "اعتبار این لینک تمام شده است. لینک جدیدی دریافت کنید." }, { status: 410 });
  if (result.result === "invalid_state") return NextResponse.json({ message: "وضعیت این تحویل تغییر کرده و لینک دیگر قابل استفاده نیست." }, { status: 409 });
  if (result.result === "invalid_promised_return") return NextResponse.json({ message: "زمان تحویل به مجموعه را برای آینده مشخص کنید." }, { status: 400 });
  if (result.result === "confirmed" && result.confirmation_type && result.technician_job_id) {
    await recordActivity({ actorId: null, action: `technician_confirmation.${result.confirmation_type}`, entityType: "technician_job", entityId: result.technician_job_id, metadata: { technician_name: result.technician_name ?? "تعمیرکار", item_name: result.repair_item_name ?? "", quantity: result.quantity ?? 1 } });
  }
  const message = result.confirmation_type === "return" ? "تحویل دستگاه به مجموعه با موفقیت تأیید شد." : result.confirmation_type === "rework" ? "تحویل مجدد دستگاه خراب به تعمیرکار تأیید شد." : "تحویل دستگاه به تعمیرکار با موفقیت تأیید شد.";
  return NextResponse.json({ alreadyConfirmed: result.result === "already_confirmed", type: result.confirmation_type, confirmedAt: result.confirmation_time, message });
}
