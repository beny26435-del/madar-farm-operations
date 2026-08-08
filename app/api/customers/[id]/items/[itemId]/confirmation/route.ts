import { NextResponse } from "next/server";
import { z } from "zod";
import { issueCustomerConfirmation } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ type: z.enum(["intake", "delivery"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { id: customerId, itemId } = await context.params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه ساخت لینک را ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نوع تأیید معتبر نیست." }, { status: 400 });

  const admin = createAdminClient();
  const { data: item } = await admin.from("customer_repair_items").select("id, status").eq("id", itemId).eq("customer_id", customerId).maybeSingle();
  if (!item) return NextResponse.json({ message: "وسیله پیدا نشد." }, { status: 404 });
  if (parsed.data.type === "delivery" && item.status === "delivered") return NextResponse.json({ message: "تحویل این وسیله قبلاً تأیید شده است." }, { status: 409 });

  try {
    const confirmation = await issueCustomerConfirmation({ itemId, type: parsed.data.type, createdBy: actorId, origin: new URL(request.url).origin });
    if (confirmation.status === "already_confirmed") return NextResponse.json({ message: "این مرحله قبلاً توسط مشتری تأیید شده است." }, { status: 409 });
    return NextResponse.json({ confirmationUrl: confirmation.url, expiresAt: confirmation.expiresAt, message: "لینک تأیید آماده است." });
  } catch {
    return NextResponse.json({ message: "ساخت لینک تأیید انجام نشد." }, { status: 500 });
  }
}
