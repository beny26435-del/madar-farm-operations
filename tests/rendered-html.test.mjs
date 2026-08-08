import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isValidTime, normalizeTime, parseJalaliDate } from "../lib/date/jalali.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("خروجی Next.js همه مسیرهای اصلی را دارد", async () => {
  const manifest = JSON.parse(await read(".next/server/app-paths-manifest.json"));
  for (const route of ["/login/page", "/dashboard/page", "/daily-reports/page", "/maintenance/page", "/employees/page", "/employees/new/page", "/customers/page", "/customers/new/page", "/customers/[id]/page", "/reports/page", "/activity/page", "/api/users/route", "/api/daily-reports/route", "/api/customers/route", "/api/customers/[id]/items/route", "/api/customers/[id]/items/[itemId]/route", "/api/reports/[type]/[id]/review/route"]) {
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

test("مرحله سوم مخارج اختیاری و فاکتور تصویری را ذخیره می‌کند", async () => {
  const api = await read("app/api/daily-reports/route.ts");
  const form = await read("components/daily-report-form.tsx");
  const list = await read("components/report-list-view.tsx");
  const migration = await read("supabase/migrations/202608080004_daily_report_expenses.sql");
  assert.match(form, /const steps = \["زمان و تاریخ", "شرح فعالیت", "مخارج"\]/);
  assert.match(form, /type="file"/);
  assert.match(form, /payload\.append\("expenses"/);
  assert.doesNotMatch(form, /توضیحات تکمیلی|مشکلات مشاهده‌شده|اقدامات انجام‌شده/);
  assert.match(api, /storage\.from\("report-invoices"\)\.upload/);
  assert.match(api, /from\("daily_report_expenses"\)\.insert/);
  assert.match(list, /report-expenses/);
  assert.match(migration, /create table public\.daily_report_expenses/);
  assert.match(migration, /'report-invoices'/);
});

test("تاریخ با تقویم شمسی و بدون ورودی تایپی انتخاب می‌شود", async () => {
  const form = await read("components/daily-report-form.tsx");
  assert.match(form, /jalali-picker-panel/);
  assert.match(form, /role="dialog" aria-label="تقویم شمسی"/);
  assert.match(form, /selectDate\(viewYear, viewMonth, day\)/);
  assert.doesNotMatch(form, /aria-label="سال شمسی"|aria-label="ماه شمسی"|aria-label="روز شمسی"/);
});

test("داشبورد و فهرست از گزارش‌های واقعی استفاده می‌کنند", async () => {
  const dashboardPage = await read("app/dashboard/page.tsx");
  const dashboard = await read("components/dashboard-view.tsx");
  const list = await read("components/report-list-view.tsx");
  assert.match(dashboardPage, /from\("daily_reports"\)/);
  assert.match(dashboard, /reviewQueue/);
  assert.match(dashboard, /dashboard-week-bars/);
  assert.match(list, /real-report-card/);
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

test("پرونده مشتری، اقلام تعمیر و تحویل را با داده واقعی مدیریت می‌کند", async () => {
  const listPage = await read("app/customers/page.tsx");
  const detail = await read("components/customer-detail-view.tsx");
  const createCustomerApi = await read("app/api/customers/route.ts");
  const itemApi = await read("app/api/customers/[id]/items/route.ts");
  const deliveryApi = await read("app/api/customers/[id]/items/[itemId]/route.ts");
  const migration = await read("supabase/migrations/202608080005_customers_and_repair_items.sql");
  assert.match(listPage, /from\("customers"\)/);
  assert.match(listPage, /from\("customer_repair_items"\)/);
  assert.match(detail, /تحویل داده شد/);
  assert.match(createCustomerApi, /from\("customers"\)\.insert/);
  assert.match(itemApi, /from\("customer_repair_items"\)\.insert/);
  assert.match(deliveryApi, /status: "delivered"/);
  assert.match(migration, /create table public\.customers/);
  assert.match(migration, /create table public\.customer_repair_items/);
  assert.match(migration, /alter table public\.customers enable row level security/);
});

test("صف بررسی، تصمیم مدیر را در گزارش و تاریخچه ثبت می‌کند", async () => {
  const page = await read("app/reports/page.tsx");
  const view = await read("components/reports-review-view.tsx");
  const api = await read("app/api/reports/[type]/[id]/review/route.ts");
  assert.match(page, /from\("daily_reports"\)/);
  assert.match(page, /from\("maintenance_reports"\)/);
  assert.match(page, /from\("report_reviews"\)/);
  assert.match(view, /\/api\/reports\/\$\{decision\.report\.type\}/);
  assert.match(api, /from\("report_reviews"\)\.insert/);
  assert.match(api, /action: `report\.\$\{input\.action\}`/);
  assert.match(api, /currentStatus !== "submitted"/);
});

test("صف فعالیت فقط رویدادهای واقعی ذخیره‌شده را نمایش می‌دهد", async () => {
  const page = await read("app/activity/page.tsx");
  const view = await read("components/activity-view.tsx");
  const logger = await read("lib/activity/log.ts");
  const migration = await read("supabase/migrations/202608080006_activity_backfill.sql");
  assert.match(page, /from\("activity_logs"\)/);
  assert.match(view, /activity-timeline/);
  assert.doesNotMatch(view, /محمد اینانلو|رضا محمدی|حسین کریمی|علی رضایی/);
  assert.match(logger, /from\("activity_logs"\)\.insert/);
  assert.match(migration, /from public\.daily_reports r/);
  assert.match(migration, /not exists/);
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
