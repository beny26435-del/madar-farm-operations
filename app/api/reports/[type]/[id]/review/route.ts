import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  action: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().trim().max(2000),
}).superRefine((value, context) => {
  if (value.action !== "approved" && value.comment.length < 2) context.addIssue({ code: "custom", path: ["comment"], message: "توضیح لازم است." });
});

export async function POST(request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await context.params;
  if (type !== "daily" && type !== "maintenance") return NextResponse.json({ message: "نوع گزارش معتبر نیست." }, { status: 400 });

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const reviewerId = claimsData?.claims?.sub;
  if (!reviewerId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: reviewer } = await supabase.from("profiles").select("role, is_active").eq("id", reviewerId).maybeSingle();
  if (!reviewer?.is_active || reviewer.role !== "admin") return NextResponse.json({ message: "اجازه بررسی گزارش را ندارید." }, { status: 403 });

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "برای رد یا درخواست اصلاح، توضیح تصمیم را وارد کنید." }, { status: 400 });
  const input = parsed.data;
  const admin = createAdminClient();

  let currentStatus: "draft" | "submitted" | "approved" | "rejected" | "revision_requested" | null = null;
  let reportTitle = "";
  if (type === "daily") {
    const { data: report } = await admin.from("daily_reports").select("status, work_summary").eq("id", id).is("deleted_at", null).maybeSingle();
    currentStatus = report?.status ?? null;
    reportTitle = report?.work_summary ?? "";
  } else {
    const { data: report } = await admin.from("maintenance_reports").select("status, title").eq("id", id).is("deleted_at", null).maybeSingle();
    currentStatus = report?.status ?? null;
    reportTitle = report?.title ?? "";
  }
  if (!currentStatus) return NextResponse.json({ message: "گزارش پیدا نشد." }, { status: 404 });
  if (currentStatus !== "submitted") return NextResponse.json({ message: "این گزارش در صف بررسی قرار ندارد." }, { status: 409 });

  const updateResult = type === "daily"
    ? await admin.from("daily_reports").update({ status: input.action }).eq("id", id).eq("status", "submitted")
    : await admin.from("maintenance_reports").update({ status: input.action }).eq("id", id).eq("status", "submitted");
  if (updateResult.error) return NextResponse.json({ message: "تغییر وضعیت گزارش انجام نشد." }, { status: 500 });

  const { error: reviewError } = await admin.from("report_reviews").insert({ report_type: type, report_id: id, reviewer_id: reviewerId, action: input.action, comment: input.comment || null });
  if (reviewError) {
    if (type === "daily") await admin.from("daily_reports").update({ status: currentStatus }).eq("id", id);
    else await admin.from("maintenance_reports").update({ status: currentStatus }).eq("id", id);
    return NextResponse.json({ message: "ثبت تصمیم بررسی انجام نشد." }, { status: 500 });
  }

  await recordActivity({ actorId: reviewerId, action: `report.${input.action}`, entityType: `${type}_report`, entityId: id, metadata: { report_type: type, title: reportTitle.slice(0, 180), comment: input.comment } });
  const messages = { approved: "گزارش تأیید شد.", rejected: "گزارش رد شد.", revision_requested: "درخواست اصلاح ثبت شد." };
  return NextResponse.json({ message: messages[input.action] });
}
