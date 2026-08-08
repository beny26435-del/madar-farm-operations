import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui";
import { hasPermission, roleLabels } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "کارکنان" };
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "employees:view")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: employees, error }, { data: profiles }] = await Promise.all([
    supabase.from("employees").select("id, profile_id, full_name, email, status").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, role"),
  ]);
  const roles = new Map((profiles ?? []).map((profile) => [profile.id, profile.role]));

  return (
    <AppShell viewer={viewer}>
      <div className="app-page employees-page">
        <div className="page-container">
          <div className="page-heading reports-heading">
            <div><span className="eyebrow"><Users /> مدیریت دسترسی</span><h1>کارکنان</h1><p>این فهرست فقط حساب‌های واقعی ثبت‌شده در Supabase را نمایش می‌دهد.</p></div>
            {hasPermission(viewer.role, "employees:manage") && <Link href="/employees/new" className="button button-primary"><Plus /> ساخت کاربر</Link>}
          </div>
          <section className="surface employees-panel">
            {error ? <ErrorState /> : employees?.length ? <div className="employees-list">{employees.map((employee) => {
              const role = employee.profile_id ? roles.get(employee.profile_id) : undefined;
              return <article key={employee.id}><span className="list-avatar"><UserRound /></span><div><strong>{employee.full_name}</strong><small dir="ltr">{employee.email}</small></div><span className="employee-role">{role ? roleLabels[role] : "بدون حساب ورود"}</span><StatusBadge tone={employee.status === "active" ? "active" : "cancelled"}>{employee.status === "active" ? "فعال" : "غیرفعال"}</StatusBadge></article>;
            })}</div> : <EmptyState title="هنوز کاربری ساخته نشده است" description="برای افزودن نخستین کارمند از دکمه ساخت کاربر استفاده کنید." action={hasPermission(viewer.role, "employees:manage") ? <Link href="/employees/new" className="button button-secondary"><Plus /> ساخت کاربر</Link> : undefined} />}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
