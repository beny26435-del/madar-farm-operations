import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidTime, normalizeTime, parseJalaliDate } from "@/lib/date/jalali";
import { createClient } from "@/lib/supabase/server";

const reportSchema = z.object({
  year: z.string().trim().min(4).max(4),
  month: z.string().trim().min(1).max(2),
  day: z.string().trim().min(1).max(2),
  startTime: z.string().trim(),
  endTime: z.string().trim(),
  workSummary: z.string().trim().min(2).max(5000),
  issues: z.string().trim().max(3000),
  actionsTaken: z.string().trim().max(3000),
  notes: z.string().trim().max(3000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims?.sub;
  if (!profileId) return NextResponse.json({ message: "نشست شما معتبر نیست. دوباره وارد شوید." }, { status: 401 });

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "اطلاعات گزارش کامل یا معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const reportDate = parseJalaliDate(input.year, input.month, input.day);
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);
  if (!reportDate) return NextResponse.json({ message: "تاریخ شمسی واردشده معتبر نیست." }, { status: 400 });
  if (!isValidTime(startTime) || !isValidTime(endTime)) return NextResponse.json({ message: "ساعت ورود یا خروج معتبر نیست." }, { status: 400 });

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();
  if (employeeError || !employee) return NextResponse.json({ message: "حساب کارمندی فعال برای شما پیدا نشد." }, { status: 403 });

  const { data: report, error } = await supabase.from("daily_reports").insert({
    employee_id: employee.id,
    report_date: reportDate,
    start_time: startTime,
    end_time: endTime,
    work_summary: input.workSummary,
    issues: input.issues || null,
    actions_taken: input.actionsTaken || null,
    notes: input.notes || null,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  }).select("id").single();

  if (error) {
    const message = error.code === "23505" ? "برای این تاریخ قبلاً گزارش ثبت کرده‌اید." : "ذخیره گزارش انجام نشد. دوباره تلاش کنید.";
    return NextResponse.json({ message }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ id: report.id, message: "گزارش با موفقیت ثبت شد." }, { status: 201 });
}
