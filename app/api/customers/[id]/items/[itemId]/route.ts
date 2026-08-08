import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(_request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { id: customerId, itemId } = await context.params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه تغییر وضعیت را ندارید." }, { status: 403 });

  const admin = createAdminClient();
  const { data: item, error } = await admin.from("customer_repair_items").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", itemId).eq("customer_id", customerId).eq("status", "received").select("id").maybeSingle();
  if (error) return NextResponse.json({ message: "تغییر وضعیت انجام نشد." }, { status: 500 });
  if (!item) return NextResponse.json({ message: "این مورد قبلاً تحویل داده شده یا پیدا نشد." }, { status: 409 });
  return NextResponse.json({ message: "وضعیت به تحویل داده‌شده تغییر کرد." });
}
