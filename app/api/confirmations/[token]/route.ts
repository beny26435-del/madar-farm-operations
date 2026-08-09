import { NextResponse } from "next/server";
import { recordActivity } from "@/lib/activity/log";
import { hashCustomerConfirmationToken, isCustomerConfirmationToken } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!isCustomerConfirmationToken(token)) return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_customer_handover", { p_token_hash: hashCustomerConfirmationToken(token) });
  if (error || !data?.[0]) return NextResponse.json({ message: "ثبت تأیید انجام نشد." }, { status: 500 });
  const result = data[0];
  if (result.result === "invalid") return NextResponse.json({ message: "لینک تأیید معتبر نیست." }, { status: 404 });
  if (result.result === "expired") return NextResponse.json({ message: "اعتبار این لینک تمام شده است. لینک جدیدی از تعمیرگاه دریافت کنید." }, { status: 410 });
  const targetId = result.repair_item_id ?? result.repair_intake_id;
  if (result.result === "confirmed" && result.confirmation_type && targetId) {
    await recordActivity({ actorId: null, action: `customer_confirmation.${result.confirmation_type}`, entityType: result.repair_item_id ? "repair_item" : "repair_intake", entityId: targetId, metadata: { customer_name: result.customer_name ?? "مشتری", item_name: result.repair_item_name ?? "" } });
  }
  return NextResponse.json({ alreadyConfirmed: result.result === "already_confirmed", type: result.confirmation_type, confirmedAt: result.confirmation_time, message: result.confirmation_type === "delivery" ? "تحویل وسیله با موفقیت تأیید شد." : "تحویل وسیله به تعمیرگاه با موفقیت تأیید شد." });
}
