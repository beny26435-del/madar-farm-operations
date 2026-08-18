import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  repairItemId: z.string().uuid(),
  technicianName: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(999),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const admin = createAdminClient();
  const { data: actor } = await admin.from("profiles").select("is_active").eq("id", actorId).maybeSingle();
  if (!actor?.is_active) return NextResponse.json({ message: "اجازه ثبت تحویل را ندارید." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "نام تعمیرکار، دستگاه و تعداد را کامل کنید." }, { status: 400 });

  const { data: item } = await admin.from("customer_repair_items").select("id, customer_id, item_name, quantity, status").eq("id", parsed.data.repairItemId).maybeSingle();
  if (!item || item.status !== "received") return NextResponse.json({ message: "دستگاه انتخاب‌شده در تعمیرگاه موجود نیست." }, { status: 404 });
  const [{ data: customer }, { data: activeJobs }] = await Promise.all([
    admin.from("customers").select("full_name").eq("id", item.customer_id).maybeSingle(),
    admin.from("technician_jobs").select("quantity").eq("repair_item_id", item.id).in("status", ["awaiting_handover", "with_technician", "awaiting_return"]),
  ]);
  if (!customer) return NextResponse.json({ message: "پرونده مشتری پیدا نشد." }, { status: 404 });
  const assignedQuantity = (activeJobs ?? []).reduce((sum, job) => sum + job.quantity, 0);
  if (assignedQuantity + parsed.data.quantity > item.quantity) return NextResponse.json({ message: "تعداد واردشده بیشتر از تعداد دستگاه‌های آزاد است." }, { status: 409 });

  const { data: job, error } = await admin.from("technician_jobs").insert({
    repair_item_id: item.id,
    technician_name: parsed.data.technicianName,
    item_name: item.item_name,
    customer_name: customer.full_name,
    quantity: parsed.data.quantity,
    created_by: actorId,
  }).select("id, repair_item_id, technician_name, item_name, customer_name, quantity, status, handed_over_at, returned_at, created_at").single();
  if (error) return NextResponse.json({ message: "ثبت تحویل به تعمیرکار انجام نشد." }, { status: 500 });

  await recordActivity({ actorId, action: "technician_job.created", entityType: "technician_job", entityId: job.id, metadata: { technician_name: job.technician_name, item_name: job.item_name, quantity: job.quantity } });
  return NextResponse.json({ job, message: "ارجاع به تعمیرکار ثبت شد." }, { status: 201 });
}
