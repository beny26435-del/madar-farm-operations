import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { parseJalaliDate } from "@/lib/date/jalali";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  year: z.string().trim().min(4).max(4),
  month: z.string().trim().min(1).max(2),
  day: z.string().trim().min(1).max(2),
  description: z.string().trim().min(2).max(500),
  amount: z.string().trim().min(1).max(20),
});
const paymentSchema = z.object({ expenseId: z.string().uuid(), paid: z.boolean() });
const allowedInvoiceTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const invoiceExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

function parseAmount(value: string) {
  const normalized = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٬,\s]/g, "");
  if (!/^\d{1,12}$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

async function activeActor() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return null;
  const admin = createAdminClient();
  const [{ data: profile }, { data: employee }] = await Promise.all([
    admin.from("profiles").select("id, role, is_active").eq("id", actorId).maybeSingle(),
    admin.from("employees").select("id, full_name, status").eq("profile_id", actorId).maybeSingle(),
  ]);
  return profile?.is_active && employee?.status === "active" ? { actorId, role: profile.role, employee, admin } : null;
}

export async function GET() {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const { data: employees, error: employeeError } = await actor.admin.from("employees").select("id, profile_id, full_name, status").eq("status", "active").order("full_name");
  if (employeeError) return NextResponse.json({ message: "دریافت فهرست مخارج انجام نشد." }, { status: 500 });
  const visibleEmployees = actor.role === "admin" ? employees ?? [] : (employees ?? []).filter((employee) => employee.id === actor.employee.id);
  const employeeIds = visibleEmployees.map((employee) => employee.id);
  const profileIds = visibleEmployees.flatMap((employee) => employee.profile_id ? [employee.profile_id] : []);
  const { data: profiles } = profileIds.length ? await actor.admin.from("profiles").select("id, avatar_path").in("id", profileIds) : { data: [] };
  const avatars = new Map((profiles ?? []).map((profile) => [profile.id, profile.avatar_path ? actor.admin.storage.from("profile-avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null]));
  const { data: expenses, error } = employeeIds.length
    ? await actor.admin.from("employee_expenses").select("id, employee_id, expense_date, description, amount, invoice_path, paid_at, paid_by, created_at").in("employee_id", employeeIds).order("expense_date", { ascending: false }).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) return NextResponse.json({ message: "دریافت مخارج انجام نشد." }, { status: 500 });
  const invoiceUrls = new Map<string, string>();
  await Promise.all((expenses ?? []).flatMap((expense) => expense.invoice_path ? [expense.invoice_path] : []).map(async (path) => {
    const { data } = await actor.admin.storage.from("report-invoices").createSignedUrl(path, 3600);
    if (data?.signedUrl) invoiceUrls.set(path, data.signedUrl);
  }));
  const names = new Map(visibleEmployees.map((employee) => [employee.id, employee.full_name]));
  const avatarUrls = new Map(visibleEmployees.map((employee) => [employee.id, employee.profile_id ? avatars.get(employee.profile_id) ?? null : null]));
  return NextResponse.json({
    employees: visibleEmployees.map((employee) => ({ id: employee.id, fullName: employee.full_name, avatarUrl: avatarUrls.get(employee.id) ?? null })),
    expenses: (expenses ?? []).map((expense) => ({ id: expense.id, employeeId: expense.employee_id, employeeName: names.get(expense.employee_id) ?? "کارمند", avatarUrl: avatarUrls.get(expense.employee_id) ?? null, expenseDate: expense.expense_date, description: expense.description, amount: expense.amount, invoiceUrl: expense.invoice_path ? invoiceUrls.get(expense.invoice_path) ?? null : null, paidAt: expense.paid_at, paidBy: expense.paid_by, createdAt: expense.created_at })),
    isAdmin: actor.role === "admin",
  });
}

export async function POST(request: Request) {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "حساب کارمندی فعال برای شما پیدا نشد." }, { status: 403 });
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "اطلاعات هزینه قابل خواندن نیست." }, { status: 400 });
  const parsed = inputSchema.safeParse({ year: formData.get("year"), month: formData.get("month"), day: formData.get("day"), description: formData.get("description"), amount: formData.get("amount") });
  if (!parsed.success) return NextResponse.json({ message: "تاریخ، مبلغ و شرح هزینه را کامل کنید." }, { status: 400 });
  const expenseDate = parseJalaliDate(parsed.data.year, parsed.data.month, parsed.data.day);
  const amount = parseAmount(parsed.data.amount);
  if (!expenseDate) return NextResponse.json({ message: "تاریخ شمسی معتبر نیست." }, { status: 400 });
  if (!amount) return NextResponse.json({ message: "مبلغ هزینه معتبر نیست." }, { status: 400 });
  const invoiceValue = formData.get("invoice");
  const invoice = invoiceValue instanceof File && invoiceValue.size > 0 ? invoiceValue : null;
  if (invoice && (!allowedInvoiceTypes.has(invoice.type) || invoice.size > 8 * 1024 * 1024)) return NextResponse.json({ message: "فاکتور باید تصویر و حداکثر ۸ مگابایت باشد." }, { status: 400 });

  const { data: expense, error } = await actor.admin.from("employee_expenses").insert({ employee_id: actor.employee.id, created_by: actor.actorId, expense_date: expenseDate, description: parsed.data.description, amount }).select("id, employee_id, expense_date, description, amount, created_at").single();
  if (error) return NextResponse.json({ message: "ثبت هزینه انجام نشد." }, { status: 500 });
  let invoiceUrl: string | null = null;
  if (invoice) {
    const path = `employee-expenses/${actor.actorId}/${expense.id}/${crypto.randomUUID()}.${invoiceExtensions[invoice.type]}`;
    const { error: uploadError } = await actor.admin.storage.from("report-invoices").upload(path, invoice, { contentType: invoice.type, upsert: false });
    if (uploadError) {
      await actor.admin.from("employee_expenses").delete().eq("id", expense.id);
      return NextResponse.json({ message: "بارگذاری تصویر فاکتور انجام نشد." }, { status: 500 });
    }
    const { error: updateError } = await actor.admin.from("employee_expenses").update({ invoice_path: path, invoice_original_name: invoice.name, invoice_mime_type: invoice.type, invoice_size_bytes: invoice.size }).eq("id", expense.id);
    if (updateError) {
      await actor.admin.storage.from("report-invoices").remove([path]);
      await actor.admin.from("employee_expenses").delete().eq("id", expense.id);
      return NextResponse.json({ message: "ذخیره فاکتور انجام نشد." }, { status: 500 });
    }
    const { data } = await actor.admin.storage.from("report-invoices").createSignedUrl(path, 3600);
    invoiceUrl = data?.signedUrl ?? null;
  }
  await recordActivity({ actorId: actor.actorId, action: "employee_expense.created", entityType: "employee_expense", entityId: expense.id, metadata: { amount, description: parsed.data.description, expense_date: expenseDate } });
  return NextResponse.json({ expense: { id: expense.id, employeeId: expense.employee_id, employeeName: actor.employee.full_name, avatarUrl: null, expenseDate: expense.expense_date, description: expense.description, amount: expense.amount, invoiceUrl, paidAt: null, paidBy: null, createdAt: expense.created_at }, message: "هزینه ثبت شد." }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  if (actor.role !== "admin") return NextResponse.json({ message: "فقط ادمین می‌تواند وضعیت پرداخت را تغییر دهد." }, { status: 403 });
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "درخواست تغییر وضعیت معتبر نیست." }, { status: 400 });
  const payment = parsed.data.paid ? { paid_at: new Date().toISOString(), paid_by: actor.actorId } : { paid_at: null, paid_by: null };
  const { data: expense, error } = await actor.admin.from("employee_expenses").update(payment).eq("id", parsed.data.expenseId).select("id, employee_id, amount, paid_at, paid_by").maybeSingle();
  if (error) return NextResponse.json({ message: "تغییر وضعیت پرداخت انجام نشد." }, { status: 500 });
  if (!expense) return NextResponse.json({ message: "هزینه پیدا نشد." }, { status: 404 });
  await recordActivity({ actorId: actor.actorId, action: parsed.data.paid ? "employee_expense.paid" : "employee_expense.unpaid", entityType: "employee_expense", entityId: expense.id, metadata: { amount: expense.amount, employee_id: expense.employee_id } });
  return NextResponse.json({ id: expense.id, paidAt: expense.paid_at, paidBy: expense.paid_by, message: parsed.data.paid ? "هزینه پرداخت‌شده ثبت شد." : "هزینه به پرداخت‌نشده بازگشت." });
}
