import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { issueCustomerConfirmation } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const intakeSchema = z.object({
  customerId: z.string().uuid().nullable(),
  newCustomer: z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30),
  }).nullable(),
  items: z.array(z.object({
    itemName: z.string().trim().min(2).max(200),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(20),
}).superRefine((value, context) => {
  if (Boolean(value.customerId) === Boolean(value.newCustomer)) {
    context.addIssue({ code: "custom", message: "یک مشتری را انتخاب یا اضافه کنید." });
  }
});

function normalizePhone(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[\s-]/g, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });

  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "اطلاعات فرم کامل نیست." }, { status: 400 });

  const admin = createAdminClient();
  const { data: actor } = await admin.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager", "employee"].includes(actor.role)) {
    return NextResponse.json({ message: "اجازه ثبت تعمیرات را ندارید." }, { status: 403 });
  }

  let customerId = parsed.data.customerId;
  let customerName = "";
  let createdCustomerId: string | null = null;

  if (parsed.data.newCustomer) {
    const phone = normalizePhone(parsed.data.newCustomer.phone);
    if (phone && phone.length < 7) return NextResponse.json({ message: "شماره تماس معتبر نیست." }, { status: 400 });
    const { data: customer, error } = await admin.from("customers").insert({
      full_name: parsed.data.newCustomer.fullName,
      phone: phone || null,
      created_by: actorId,
    }).select("id, full_name").single();
    if (error) return NextResponse.json({ message: error.code === "23505" ? "مشتری دیگری با این شماره تماس وجود دارد." : "ثبت مشتری انجام نشد." }, { status: error.code === "23505" ? 409 : 500 });
    customerId = customer.id;
    createdCustomerId = customer.id;
    customerName = customer.full_name;
  } else if (customerId) {
    const { data: customer } = await admin.from("customers").select("id, full_name").eq("id", customerId).maybeSingle();
    if (!customer) return NextResponse.json({ message: "مشتری انتخاب‌شده پیدا نشد." }, { status: 404 });
    customerName = customer.full_name;
  }

  if (!customerId) return NextResponse.json({ message: "مشتری مشخص نشده است." }, { status: 400 });
  const { data: intake, error: intakeError } = await admin.from("customer_repair_intakes").insert({ customer_id: customerId, created_by: actorId }).select("id").single();
  if (intakeError) {
    if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
    return NextResponse.json({ message: "ثبت دریافت تعمیرات انجام نشد." }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("customer_repair_items").insert(parsed.data.items.map((item) => ({
    customer_id: customerId,
    intake_id: intake.id,
    item_name: item.itemName,
    quantity: item.quantity,
    details: null,
    created_by: actorId,
  })));
  if (itemsError) {
    await admin.from("customer_repair_intakes").delete().eq("id", intake.id);
    if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
    return NextResponse.json({ message: "ثبت وسایل انجام نشد." }, { status: 500 });
  }

  let confirmationUrl: string | null = null;
  try {
    const confirmation = await issueCustomerConfirmation({ intakeId: intake.id, type: "intake", createdBy: actorId, origin: new URL(request.url).origin });
    if (confirmation.status === "issued") confirmationUrl = confirmation.url;
  } catch {
    // The intake is safely saved even if the share link cannot be generated temporarily.
  }

  const totalQuantity = parsed.data.items.reduce((sum, item) => sum + item.quantity, 0);
  await recordActivity({ actorId, action: "repair_intake.created", entityType: "repair_intake", entityId: intake.id, metadata: { customer_name: customerName, item_count: parsed.data.items.length, total_quantity: totalQuantity } });
  return NextResponse.json({ id: intake.id, customerId, confirmationUrl, message: confirmationUrl ? "تعمیرات ثبت شد و لینک تأیید آماده است." : "تعمیرات ثبت شد؛ لینک تأیید را بعداً دوباره بسازید." }, { status: 201 });
}
