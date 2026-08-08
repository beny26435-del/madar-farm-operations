import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isValidTime, normalizeTime, parseJalaliDate } from "../lib/date/jalali.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("خروجی Next.js همه مسیرهای اصلی را دارد", async () => {
  const manifest = JSON.parse(await read(".next/server/app-paths-manifest.json"));
  for (const route of ["/login/page", "/dashboard/page", "/daily-reports/page", "/maintenance/page", "/employees/page", "/employees/new/page", "/api/users/route", "/api/daily-reports/route"]) {
    assert.ok(manifest[route], `missing ${route}`);
  }
});

test("فرم‌ها هیچ مقدار اولیه‌ای ندارند", async () => {
  const source = `${await read("components/login-view.tsx")}\n${await read("components/report-wizard.tsx")}\n${await read("components/daily-report-form.tsx")}\n${await read("components/employee-create-form.tsx")}`;
  assert.doesNotMatch(source, /defaultValue=/);
  assert.doesNotMatch(source, /defaultValues:/);
  assert.match(source, /autoComplete="off"/);
  assert.doesNotMatch(source, /type="time"/);
  assert.doesNotMatch(source, /مثلاً|example/i);
});

test("تاریخ شمسی معتبر به تاریخ دیتابیس تبدیل می‌شود", () => {
  assert.equal(parseJalaliDate("۱۴۰۵", "۵", "۱۷"), "2026-08-08");
  assert.equal(parseJalaliDate("1403", "1", "1"), "2024-03-20");
  assert.equal(parseJalaliDate("1402", "12", "30"), null);
});

test("ساعت تایپی فارسی و لاتین درست پردازش می‌شود", () => {
  assert.equal(normalizeTime("۰۸۳۰"), "08:30");
  assert.equal(normalizeTime("۸۳۰"), "8:30");
  assert.equal(isValidTime("8:30"), true);
  assert.equal(isValidTime("25:10"), false);
});

test("گزارش روزانه واقعاً در Supabase ثبت می‌شود", async () => {
  const api = await read("app/api/daily-reports/route.ts");
  const form = await read("components/daily-report-form.tsx");
  assert.match(api, /from\("daily_reports"\)\.insert/);
  assert.match(api, /from\("employees"\)/);
  assert.match(api, /status: "submitted"/);
  assert.match(form, /fetch\("\/api\/daily-reports"/);
  assert.doesNotMatch(form, /نام کارمند.*input/s);
});

test("داشبورد و فهرست گزارش فاقد رکورد ثابت هستند", async () => {
  const dashboard = await read("components/dashboard-view.tsx");
  const reports = await read("components/report-list-view.tsx");
  assert.doesNotMatch(dashboard, /const pending|const activities|chartData/);
  assert.doesNotMatch(reports, /const dailyReports|const maintenanceReports/);
  assert.match(dashboard, /صف بررسی خالی است/);
  assert.match(reports, /هنوز گزارشی ثبت نشده است/);
});

test("مدیر فقط با نام، ایمیل و رمز حساب کارمند می‌سازد", async () => {
  const api = await read("app/api/users/route.ts");
  const form = await read("components/employee-create-form.tsx");
  const roles = await read("lib/auth/roles.ts");
  assert.match(api, /role: "employee"/);
  assert.doesNotMatch(form, /personnelCode|mobile|register\("role"\)/);
  assert.doesNotMatch(api, /personnelCode|normalizePhone|input\.role/);
  assert.match(roles, /"employees:manage"/);
  assert.match(api, /createAdminClient/);
});

test("migration قواعد هویتی و RLS را حفظ می‌کند", async () => {
  const sql = await read("supabase/migrations/202608080001_phase3_identity_and_core_schema.sql");
  const cleanup = await read("supabase/migrations/202608080002_remove_shifts_and_simplify_employees.sql");
  const dailyDetails = await read("supabase/migrations/202608080003_persist_daily_report_details.sql");
  assert.match(sql, /create type public\.app_role as enum \('admin', 'manager', 'employee'\)/);
  assert.match(cleanup, /drop column shift/);
  assert.match(cleanup, /daily_reports_employee_date_live_key/);
  assert.match(cleanup, /drop column personnel_code/);
  assert.match(cleanup, /drop column mobile/);
  assert.match(dailyDetails, /add column start_time time/);
  assert.match(dailyDetails, /add column actions_taken text/);
  assert.match(sql, /num_nonnulls\(technician_employee_id, nullif\(trim\(technician_name\), ''\)\) = 1/);
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /Report revisions are immutable/);
  assert.match(sql, /revoke all on all tables in schema public from anon/);
});
