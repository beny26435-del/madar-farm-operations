import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("خروجی Next.js همه مسیرهای اصلی را دارد", async () => {
  const manifest = JSON.parse(await read(".next/server/app-paths-manifest.json"));
  for (const route of ["/login/page", "/dashboard/page", "/daily-reports/page", "/maintenance/page", "/employees/page", "/employees/new/page", "/api/users/route"]) {
    assert.ok(manifest[route], `missing ${route}`);
  }
});

test("فرم‌ها هیچ مقدار اولیه‌ای ندارند", async () => {
  const source = `${await read("components/login-view.tsx")}\n${await read("components/report-wizard.tsx")}\n${await read("components/employee-create-form.tsx")}`;
  assert.doesNotMatch(source, /defaultValue=/);
  assert.doesNotMatch(source, /defaultValues:/);
  assert.match(source, /autoComplete="off"/);
});

test("داشبورد و فهرست گزارش فاقد رکورد ثابت هستند", async () => {
  const dashboard = await read("components/dashboard-view.tsx");
  const reports = await read("components/report-list-view.tsx");
  assert.doesNotMatch(dashboard, /const pending|const activities|chartData/);
  assert.doesNotMatch(reports, /const dailyReports|const maintenanceReports/);
  assert.match(dashboard, /صف بررسی خالی است/);
  assert.match(reports, /هنوز گزارشی ثبت نشده است/);
});

test("مدیر عملیات فقط حساب کارمند می‌سازد", async () => {
  const api = await read("app/api/users/route.ts");
  const roles = await read("lib/auth/roles.ts");
  assert.match(api, /actor\.role === "admin" \? input\.role : "employee"/);
  assert.match(roles, /"employees:manage"/);
  assert.match(api, /createAdminClient/);
});

test("migration قواعد هویتی و RLS را حفظ می‌کند", async () => {
  const sql = await read("supabase/migrations/202608080001_phase3_identity_and_core_schema.sql");
  assert.match(sql, /create type public\.app_role as enum \('admin', 'manager', 'employee'\)/);
  assert.match(sql, /daily_reports_employee_date_shift_live_key/);
  assert.match(sql, /num_nonnulls\(technician_employee_id, nullif\(trim\(technician_name\), ''\)\) = 1/);
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /Report revisions are immutable/);
  assert.match(sql, /revoke all on all tables in schema public from anon/);
});
