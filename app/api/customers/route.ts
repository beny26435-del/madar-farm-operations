import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
});

function normalizePhone(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[\s-]/g, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });

  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه ثبت مشتری را ندارید." }, { status: 403 });

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نام مشتری را کامل و درست وارد کنید." }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);
  if (phone && phone.length < 7) return NextResponse.json({ message: "شماره تماس معتبر نیست." }, { status: 400 });

  const admin = createAdminClient();
  const { data: customer, error } = await admin.from("customers").insert({ full_name: parsed.data.fullName, phone: phone || null, created_by: actorId }).select("id").single();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "مشتری دیگری با این شماره تماس وجود دارد." : "ثبت مشتری انجام نشد." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ id: customer.id, message: "مشتری ثبت شد." }, { status: 201 });
}
