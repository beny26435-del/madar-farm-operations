import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { isValidTime, normalizeTime, parseJalaliDate } from "@/lib/date/jalali";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const reportSchema = z.object({
  year: z.string().trim().min(4).max(4),
  month: z.string().trim().min(1).max(2),
  day: z.string().trim().min(1).max(2),
  startTime: z.string().trim(),
  endTime: z.string().trim(),
  location: z.string().trim().min(2).max(200),
  collaboratorIds: z.array(z.string().uuid()).max(20).refine((values) => new Set(values).size === values.length),
  workSummary: z.string().trim().min(2).max(5000),
});

const expenseSchema = z.array(z.object({
  description: z.string().trim().min(2).max(500),
  amount: z.string().trim().min(1).max(20),
})).max(10);

const allowedInvoiceTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const invoiceExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

function parseExpenseAmount(value: string) {
  const normalized = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٬,\s]/g, "");
  if (!/^\d{1,12}$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims?.sub;
  if (!profileId) return NextResponse.json({ message: "نشست شما معتبر نیست. دوباره وارد شوید." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "اطلاعات گزارش قابل خواندن نیست." }, { status: 400 });
  const reportValue = formData.get("report");
  const expensesValue = formData.get("expenses");
  const parsed = reportSchema.safeParse(parseJson(reportValue));
  if (!parsed.success) return NextResponse.json({ message: "اطلاعات گزارش کامل یا معتبر نیست." }, { status: 400 });
  const parsedExpenses = expenseSchema.safeParse(expensesValue === null ? [] : parseJson(expensesValue));
  if (!parsedExpenses.success) return NextResponse.json({ message: "اطلاعات مخارج کامل یا معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const expenses = parsedExpenses.data.map((expense) => ({ ...expense, parsedAmount: parseExpenseAmount(expense.amount) }));
  if (expenses.some((expense) => expense.parsedAmount === null)) return NextResponse.json({ message: "مبلغ یکی از مخارج معتبر نیست." }, { status: 400 });
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

  const invoices = expenses.map((_, index) => {
    const value = formData.get(`invoice-${index}`);
    return value instanceof File && value.size > 0 ? value : null;
  });
  for (const invoice of invoices) {
    if (invoice && (!allowedInvoiceTypes.has(invoice.type) || invoice.size > 8 * 1024 * 1024)) {
      return NextResponse.json({ message: "فاکتور باید تصویر JPG، PNG، WEBP یا HEIC و حداکثر ۸ مگابایت باشد." }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  if (input.collaboratorIds.length > 0) {
    const { data: collaborators, error: collaboratorsError } = await admin.from("employees").select("id, full_name").in("id", input.collaboratorIds).eq("status", "active");
    const hasInvalidSelfSelection = collaborators?.some((collaborator) => collaborator.id === employee.id && collaborator.full_name.trim() !== "میلاد");
    if (collaboratorsError || collaborators?.length !== input.collaboratorIds.length || hasInvalidSelfSelection) return NextResponse.json({ message: "یکی از همکاران انتخاب‌شده معتبر نیست." }, { status: 400 });
  }
  const { data: report, error } = await admin.from("daily_reports").insert({
    employee_id: employee.id,
    report_date: reportDate,
    start_time: startTime,
    end_time: endTime,
    location: input.location,
    work_summary: input.workSummary,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  }).select("id").single();

  if (error) {
    return NextResponse.json({ message: "ذخیره گزارش انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }

  if (input.collaboratorIds.length > 0) {
    const { error: collaboratorError } = await admin.from("daily_report_collaborators").insert(input.collaboratorIds.map((employeeId) => ({ daily_report_id: report.id, employee_id: employeeId })));
    if (collaboratorError) {
      await admin.from("daily_reports").delete().eq("id", report.id);
      return NextResponse.json({ message: "ذخیره همکاران همراه انجام نشد." }, { status: 500 });
    }
  }

  const uploadedPaths: string[] = [];
  const expenseRows = [];
  for (let index = 0; index < expenses.length; index += 1) {
    const expense = expenses[index];
    const invoice = invoices[index];
    let invoicePath: string | null = null;
    if (invoice) {
      const extension = invoiceExtensions[invoice.type];
      invoicePath = `${profileId}/${report.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("report-invoices").upload(invoicePath, invoice, { contentType: invoice.type, upsert: false });
      if (uploadError) {
        if (uploadedPaths.length > 0) await admin.storage.from("report-invoices").remove(uploadedPaths);
        await admin.from("daily_reports").delete().eq("id", report.id);
        return NextResponse.json({ message: "بارگذاری تصویر فاکتور انجام نشد. دوباره تلاش کنید." }, { status: 500 });
      }
      uploadedPaths.push(invoicePath);
    }
    expenseRows.push({
      daily_report_id: report.id,
      description: expense.description,
      amount: expense.parsedAmount as number,
      invoice_path: invoicePath,
      invoice_original_name: invoice?.name ?? null,
      invoice_mime_type: invoice?.type ?? null,
      invoice_size_bytes: invoice?.size ?? null,
    });
  }

  if (expenseRows.length > 0) {
    const { error: expenseError } = await admin.from("daily_report_expenses").insert(expenseRows);
    if (expenseError) {
      if (uploadedPaths.length > 0) await admin.storage.from("report-invoices").remove(uploadedPaths);
      await admin.from("daily_reports").delete().eq("id", report.id);
      return NextResponse.json({ message: "ذخیره مخارج انجام نشد. دوباره تلاش کنید." }, { status: 500 });
    }
  }
  await recordActivity({ actorId: profileId, action: "daily_report.submitted", entityType: "daily_report", entityId: report.id, metadata: { summary: input.workSummary.slice(0, 180), report_date: reportDate, location: input.location } });
  return NextResponse.json({ id: report.id, message: "گزارش با موفقیت ثبت شد." }, { status: 201 });
}
