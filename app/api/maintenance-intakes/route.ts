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

const photoExtensions = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
  ["image/heic", "heic"], ["image/heif", "heif"],
]);

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function normalizePhone(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[\s-]/g, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });

  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const formData = isMultipart ? await request.formData().catch(() => null) : null;
  if (isMultipart && !formData) return NextResponse.json({ message: "اطلاعات تعمیرات قابل خواندن نیست." }, { status: 400 });
  const parsed = intakeSchema.safeParse(formData ? parseJson(formData.get("intake")) : await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "اطلاعات فرم کامل نیست." }, { status: 400 });
  const photos = parsed.data.items.map((_, index) => {
    const value = formData?.get(`device-photo-${index}`);
    return value instanceof File && value.size > 0 ? value : null;
  });
  for (const photo of photos) {
    if (photo && (!photoExtensions.has(photo.type) || photo.size > 8 * 1024 * 1024)) {
      return NextResponse.json({ message: "عکس دستگاه باید JPG، PNG، WEBP یا HEIC و حداکثر ۸ مگابایت باشد." }, { status: 400 });
    }
  }

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

  const uploadedPaths: string[] = [];
  for (let index = 0; index < parsed.data.items.length; index += 1) {
    const item = parsed.data.items[index];
    const photo = photos[index];
    const { data: savedItem, error: itemError } = await admin.from("customer_repair_items").insert({
      customer_id: customerId, intake_id: intake.id, item_name: item.itemName,
      quantity: item.quantity, details: null, created_by: actorId,
    }).select("id").single();
    if (itemError) {
      if (uploadedPaths.length) await admin.storage.from("repair-item-photos").remove(uploadedPaths);
      await admin.from("customer_repair_intakes").delete().eq("id", intake.id);
      if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
      return NextResponse.json({ message: "ثبت وسایل انجام نشد." }, { status: 500 });
    }
    if (photo) {
      const photoPath = `${actorId}/${intake.id}/${savedItem.id}-${crypto.randomUUID()}.${photoExtensions.get(photo.type)}`;
      const { error: uploadError } = await admin.storage.from("repair-item-photos").upload(photoPath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) {
        if (uploadedPaths.length) await admin.storage.from("repair-item-photos").remove(uploadedPaths);
        await admin.from("customer_repair_intakes").delete().eq("id", intake.id);
        if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
        return NextResponse.json({ message: "بارگذاری عکس دستگاه انجام نشد." }, { status: 500 });
      }
      uploadedPaths.push(photoPath);
      const { error: photoUpdateError } = await admin.from("customer_repair_items").update({
        photo_path: photoPath, photo_original_name: photo.name, photo_mime_type: photo.type, photo_size_bytes: photo.size,
      }).eq("id", savedItem.id);
      if (photoUpdateError) {
        await admin.storage.from("repair-item-photos").remove(uploadedPaths);
        await admin.from("customer_repair_intakes").delete().eq("id", intake.id);
        if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
        return NextResponse.json({ message: "ذخیره مشخصات عکس دستگاه انجام نشد." }, { status: 500 });
      }
    }
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
  const savedLabel = photos.some(Boolean) ? "تعمیرات و عکس‌های دستگاه" : "تعمیرات";
  return NextResponse.json({ id: intake.id, customerId, confirmationUrl, message: confirmationUrl ? `${savedLabel} ثبت شد؛ لینک تأیید آماده است.` : `${savedLabel} ثبت شد؛ لینک تأیید را بعداً دوباره بسازید.` }, { status: 201 });
}
