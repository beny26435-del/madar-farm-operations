import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });

  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) {
    return NextResponse.json({ message: "اجازه ساخت کاربر را ندارید." }, { status: 403 });
  }

  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نام، ایمیل و رمز عبور را کامل و درست وارد کنید." }, { status: 400 });

  const input = parsed.data;
  const email = input.email.toLowerCase();

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.fullName },
  });

  if (createError || !created.user) {
    return NextResponse.json({ message: "این ایمیل قبلاً استفاده شده است." }, { status: 409 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").update({ display_name: input.fullName, role: "employee", is_active: true }).eq("id", userId);
  const { error: employeeError } = await admin.from("employees").insert({
    profile_id: userId,
    full_name: input.fullName,
    email,
    status: "active",
  });

  if (profileError || employeeError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ message: employeeError?.code === "23505" ? "این ایمیل قبلاً استفاده شده است." : "ساخت حساب کارمند کامل نشد." }, { status: 409 });
  }

  return NextResponse.json({ message: "حساب کارمند ساخته شد و آمادهٔ ورود است." }, { status: 201 });
}
