import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  personnelCode: z.string().trim().min(2).max(32),
  email: z.string().trim().email().or(z.literal("")),
  mobile: z.string().trim().max(20),
  password: z.string().min(12).max(128),
  role: z.enum(["employee", "manager"]),
}).refine((value) => Boolean(value.email || value.mobile), { message: "ایمیل یا موبایل الزامی است." });

function normalizeDigits(value: string) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String(Math.max(fa.indexOf(digit), ar.indexOf(digit))));
}

function normalizePhone(value: string) {
  const phone = normalizeDigits(value).replace(/[^\d+]/g, "");
  if (phone.startsWith("09")) return `+98${phone.slice(1)}`;
  if (phone.startsWith("98")) return `+${phone}`;
  return phone;
}

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
  if (!parsed.success) return NextResponse.json({ message: "اطلاعات فرم کامل یا معتبر نیست." }, { status: 400 });

  const input = parsed.data;
  const role = actor.role === "admin" ? input.role : "employee";
  const phone = input.mobile ? normalizePhone(input.mobile) : undefined;
  if (phone && !/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json({ message: "شماره موبایل باید با قالب بین‌المللی معتبر باشد." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email || undefined,
    phone,
    password: input.password,
    email_confirm: Boolean(input.email),
    phone_confirm: Boolean(phone),
    user_metadata: { display_name: input.fullName },
  });

  if (createError || !created.user) {
    return NextResponse.json({ message: "این ایمیل یا شماره موبایل قبلاً استفاده شده است." }, { status: 409 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").update({ display_name: input.fullName, role, is_active: true }).eq("id", userId);
  const { error: employeeError } = await admin.from("employees").insert({
    profile_id: userId,
    personnel_code: input.personnelCode,
    full_name: input.fullName,
    mobile: phone ?? null,
    status: "active",
  });

  if (profileError || employeeError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ message: employeeError?.code === "23505" ? "کد پرسنلی یا موبایل تکراری است." : "ساخت پروفایل کاربر کامل نشد." }, { status: 409 });
  }

  return NextResponse.json({ message: "حساب کاربر با موفقیت ساخته شد." }, { status: 201 });
}
