import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { issueCustomerConfirmation } from "@/lib/customer-confirmations/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  itemName: z.string().trim().min(2).max(200),
  quantity: z.number().int().min(1).max(999),
});

const photoExtensions = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
  ["image/heic", "heic"], ["image/heif", "heif"],
]);

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await context.params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active || !["admin", "manager"].includes(actor.role)) return NextResponse.json({ message: "اجازه ثبت وسیله را ندارید." }, { status: 403 });

  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const formData = isMultipart ? await request.formData().catch(() => null) : null;
  const parsed = itemSchema.safeParse(formData ? parseJson(formData.get("item")) : await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نام وسیله یا قطعه را کامل وارد کنید." }, { status: 400 });
  const photoValue = formData?.get("device-photo");
  const photo = photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
  if (photo && (!photoExtensions.has(photo.type) || photo.size > 8 * 1024 * 1024)) return NextResponse.json({ message: "عکس دستگاه باید JPG، PNG، WEBP یا HEIC و حداکثر ۸ مگابایت باشد." }, { status: 400 });
  const admin = createAdminClient();
  const { data: customer } = await admin.from("customers").select("id, full_name").eq("id", customerId).maybeSingle();
  if (!customer) return NextResponse.json({ message: "مشتری پیدا نشد." }, { status: 404 });
  const { data: item, error } = await admin.from("customer_repair_items").insert({ customer_id: customerId, item_name: parsed.data.itemName, quantity: parsed.data.quantity, details: null, created_by: actorId }).select("id").single();
  if (error) return NextResponse.json({ message: "ثبت وسیله انجام نشد." }, { status: 500 });
  if (photo) {
    const photoPath = `${actorId}/${item.id}-${crypto.randomUUID()}.${photoExtensions.get(photo.type)}`;
    const { error: uploadError } = await admin.storage.from("repair-item-photos").upload(photoPath, photo, { contentType: photo.type, upsert: false });
    if (uploadError) {
      await admin.from("customer_repair_items").delete().eq("id", item.id);
      return NextResponse.json({ message: "بارگذاری عکس دستگاه انجام نشد." }, { status: 500 });
    }
    const { error: updateError } = await admin.from("customer_repair_items").update({ photo_path: photoPath, photo_original_name: photo.name, photo_mime_type: photo.type, photo_size_bytes: photo.size }).eq("id", item.id);
    if (updateError) {
      await admin.storage.from("repair-item-photos").remove([photoPath]);
      await admin.from("customer_repair_items").delete().eq("id", item.id);
      return NextResponse.json({ message: "ذخیره عکس دستگاه انجام نشد." }, { status: 500 });
    }
  }
  let confirmationUrl: string | null = null;
  try {
    const confirmation = await issueCustomerConfirmation({ itemId: item.id, type: "intake", createdBy: actorId, origin: new URL(request.url).origin });
    if (confirmation.status === "issued") confirmationUrl = confirmation.url;
  } catch {
    // The repair item remains safely registered if link generation is temporarily unavailable.
  }
  await recordActivity({ actorId, action: "repair_item.received", entityType: "repair_item", entityId: item.id, metadata: { item_name: parsed.data.itemName, quantity: parsed.data.quantity, customer_name: customer.full_name } });
  return NextResponse.json({ id: item.id, confirmationUrl, message: confirmationUrl ? "وسیله ثبت شد. لینک تأیید مشتری آماده است." : "وسیله ثبت شد؛ ساخت لینک تأیید را دوباره انجام دهید." }, { status: 201 });
}
