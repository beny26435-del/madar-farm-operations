import { NextResponse } from "next/server";
import { recordActivity } from "@/lib/activity/log";
import { issueCustomerConfirmation } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { id: customerId, itemId } = await context.params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه تغییر وضعیت را ندارید." }, { status: 403 });

  const admin = createAdminClient();
  const { data: item, error } = await admin.from("customer_repair_items").select("id, item_name, status").eq("id", itemId).eq("customer_id", customerId).maybeSingle();
  if (error) return NextResponse.json({ message: "دریافت اطلاعات وسیله انجام نشد." }, { status: 500 });
  if (!item) return NextResponse.json({ message: "وسیله پیدا نشد." }, { status: 404 });
  if (item.status === "delivered") return NextResponse.json({ message: "تحویل این وسیله قبلاً تأیید شده است." }, { status: 409 });
  const { data: customer } = await admin.from("customers").select("full_name").eq("id", customerId).maybeSingle();
  try {
    const confirmation = await issueCustomerConfirmation({ itemId, type: "delivery", createdBy: actorId, origin: new URL(request.url).origin });
    if (confirmation.status === "already_confirmed") return NextResponse.json({ message: "تحویل این وسیله قبلاً تأیید شده است." }, { status: 409 });
    await recordActivity({ actorId, action: "repair_item.delivery_requested", entityType: "repair_item", entityId: item.id, metadata: { item_name: item.item_name, customer_name: customer?.full_name ?? "" } });
    return NextResponse.json({ confirmationUrl: confirmation.url, message: "لینک تأیید تحویل آماده است." });
  } catch {
    return NextResponse.json({ message: "ساخت لینک تأیید تحویل انجام نشد." }, { status: 500 });
  }
}
