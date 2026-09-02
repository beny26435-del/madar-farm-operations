import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ExpensesView, type ExpenseRecord } from "@/components/expenses-view";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "مخارج" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const viewer = await requireViewer();
  const admin = createAdminClient();
  const { data: allEmployees } = await admin.from("employees").select("id, profile_id, full_name, status").eq("status", "active").order("full_name");
  const viewerEmployee = (allEmployees ?? []).find((employee) => employee.profile_id === viewer.id) ?? null;
  const visibleEmployees = viewer.role === "admin" ? allEmployees ?? [] : viewerEmployee ? [viewerEmployee] : [];
  const profileIds = visibleEmployees.flatMap((employee) => employee.profile_id ? [employee.profile_id] : []);
  const { data: profiles } = profileIds.length ? await admin.from("profiles").select("id, avatar_path").in("id", profileIds) : { data: [] };
  const avatars = new Map((profiles ?? []).map((profile) => [profile.id, profile.avatar_path ? admin.storage.from("profile-avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null]));
  const employeeItems = visibleEmployees.map((employee) => ({ id: employee.id, fullName: employee.full_name, avatarUrl: employee.profile_id ? avatars.get(employee.profile_id) ?? null : null }));
  const employeeIds = visibleEmployees.map((employee) => employee.id);
  const { data: expenses, error } = employeeIds.length
    ? await admin.from("employee_expenses").select("id, employee_id, expense_date, description, amount, invoice_path, paid_at, paid_by, created_at").in("employee_id", employeeIds).order("expense_date", { ascending: false }).order("created_at", { ascending: false })
    : { data: [], error: null };
  const invoiceUrls = new Map<string, string>();
  await Promise.all((expenses ?? []).flatMap((expense) => expense.invoice_path ? [expense.invoice_path] : []).map(async (path) => {
    const { data } = await admin.storage.from("report-invoices").createSignedUrl(path, 3600);
    if (data?.signedUrl) invoiceUrls.set(path, data.signedUrl);
  }));
  const names = new Map(employeeItems.map((employee) => [employee.id, employee.fullName]));
  const avatarUrls = new Map(employeeItems.map((employee) => [employee.id, employee.avatarUrl]));
  const records: ExpenseRecord[] = (expenses ?? []).map((expense) => ({ id: expense.id, employeeId: expense.employee_id, employeeName: names.get(expense.employee_id) ?? "کارمند", avatarUrl: avatarUrls.get(expense.employee_id) ?? null, expenseDate: expense.expense_date, description: expense.description, amount: expense.amount, invoiceUrl: expense.invoice_path ? invoiceUrls.get(expense.invoice_path) ?? null : null, paidAt: expense.paid_at, paidBy: expense.paid_by, createdAt: expense.created_at }));
  return <AppShell viewer={viewer}><ExpensesView initialExpenses={records} employees={employeeItems} isAdmin={viewer.role === "admin"} viewerEmployeeId={viewerEmployee?.id ?? null} loadError={Boolean(error)} /></AppShell>;
}
