import { NextResponse } from "next/server";
import { recordActivity } from "@/lib/activity/log";
import { hashTechnicianConfirmationToken, isTechnicianConfirmationToken } from "@/lib/technician-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!isTechnicianConfirmationToken(token)) return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_technician_handover", { p_token_hash: hashTechnicianConfirmationToken(token) });
  if (error || !data?.[0]) return NextResponse.json({ message: "ثبت تأیید انجام نشد." }, { status: 500 });
  const result = data[0];
  if (result.result === "invalid") return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  if (result.result === "expired") return NextResponse.json({ message: "اعتبار این لینک تمام شده است. لینک جدیدی دریافت کنید." }, { status: 410 });
  if (result.result === "invalid_state") return NextResponse.json({ message: "وضعیت این تحویل تغییر کرده و لینک دیگر قابل استفاده نیست." }, { status: 409 });
  if (result.result === "confirmed" && result.confirmation_type && result.technician_job_id) {
    await recordActivity({ actorId: null, action: `technician_confirmation.${result.confirmation_type}`, entityType: "technician_job", entityId: result.technician_job_id, metadata: { technician_name: result.technician_name ?? "تعمیرکار", item_name: result.repair_item_name ?? "", quantity: result.quantity ?? 1 } });
  }
  return NextResponse.json({ alreadyConfirmed: result.result === "already_confirmed", type: result.confirmation_type, confirmedAt: result.confirmation_time, message: result.confirmation_type === "return" ? "بازگشت دستگاه با موفقیت تأیید شد." : "تحویل دستگاه به تعمیرکار با موفقیت تأیید شد." });
}
