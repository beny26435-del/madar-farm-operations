import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { issueCustomerConfirmation } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  itemName: z.string().trim().min(2).max(200),
  details: z.string().trim().max(2000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await context.params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه ثبت وسیله را ندارید." }, { status: 403 });

  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نام وسیله یا قطعه را کامل وارد کنید." }, { status: 400 });
  const admin = createAdminClient();
  const { data: customer } = await admin.from("customers").select("id, full_name").eq("id", customerId).maybeSingle();
  if (!customer) return NextResponse.json({ message: "مشتری پیدا نشد." }, { status: 404 });
  const { data: item, error } = await admin.from("customer_repair_items").insert({ customer_id: customerId, item_name: parsed.data.itemName, details: parsed.data.details || null, created_by: actorId }).select("id").single();
  if (error) return NextResponse.json({ message: "ثبت وسیله انجام نشد." }, { status: 500 });
  let confirmationUrl: string | null = null;
  try {
    const confirmation = await issueCustomerConfirmation({ itemId: item.id, type: "intake", createdBy: actorId, origin: new URL(request.url).origin });
    if (confirmation.status === "issued") confirmationUrl = confirmation.url;
  } catch {
    // The repair item remains safely registered if link generation is temporarily unavailable.
  }
  await recordActivity({ actorId, action: "repair_item.received", entityType: "repair_item", entityId: item.id, metadata: { item_name: parsed.data.itemName, customer_name: customer.full_name } });
  return NextResponse.json({ id: item.id, confirmationUrl, message: confirmationUrl ? "وسیله ثبت شد. لینک تأیید مشتری آماده است." : "وسیله ثبت شد؛ ساخت لینک تأیید را دوباره انجام دهید." }, { status: 201 });
}
