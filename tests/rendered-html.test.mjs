import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isValidTime, normalizeTime, parseJalaliDate } from "../lib/date/jalali.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("خروجی Next.js همه مسیرهای اصلی را دارد", async () => {
  const manifest = JSON.parse(await read(".next/server/app-paths-manifest.json"));
  for (const route of ["/login/page", "/offline/page", "/dashboard/page", "/daily-reports/page", "/daily-tasks/page", "/maintenance/page", "/maintenance/new/page", "/employees/page", "/employees/new/page", "/customers/page", "/customers/new/page", "/customers/[id]/page", "/technicians/page", "/profile/page", "/reports/page", "/activity/page", "/confirm/[token]/page", "/technician-confirm/[token]/page", "/api/users/route", "/api/daily-reports/route", "/api/daily-tasks/route", "/api/maintenance-intakes/route", "/api/customers/route", "/api/customers/[id]/items/route", "/api/customers/[id]/items/[itemId]/route", "/api/customers/[id]/items/[itemId]/confirmation/route", "/api/confirmations/[token]/route", "/api/technician-jobs/route", "/api/technician-jobs/[id]/confirmation/route", "/api/technician-confirmations/[token]/route", "/api/profile/avatar/route", "/api/reports/[type]/[id]/review/route"]) {
    assert.ok(manifest[route], `missing ${route}`);
  }
});

test("فرم‌ها هیچ مقدار اولیه‌ای ندارند", async () => {
  const source = `${await read("components/login-view.tsx")}\n${await read("components/report-wizard.tsx")}\n${await read("components/daily-report-form.tsx")}\n${await read("components/employee-create-form.tsx")}\n${await read("components/maintenance-intake-form.tsx")}`;
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

test("گزارش روزانه محل پروژه و همکاران همراه را ذخیره می‌کند", async () => {
  const page = await read("app/daily-reports/new/page.tsx");
  const form = await read("components/daily-report-form.tsx");
  const api = await read("app/api/daily-reports/route.ts");
  const list = await read("components/report-list-view.tsx");
  const migration = await read("supabase/migrations/202608180009_daily_report_collaborators_and_tasks.sql");
  assert.match(page, /from\("employees"\)/);
  assert.match(page, /full_name\.trim\(\) === "میلاد"/);
  assert.match(form, /محل انجام کار/);
  assert.match(form, /همکاران همراه/);
  assert.match(form, /type="checkbox"/);
  assert.match(api, /location: input\.location/);
  assert.match(api, /from\("daily_report_collaborators"\)\.insert/);
  assert.match(list, /report-project-meta/);
  assert.match(migration, /add column location text/);
  assert.match(migration, /create table public\.daily_report_collaborators/);
});

test("فقط ادمین اصلی همه گزارش‌ها را می‌بیند و کاربران فقط گزارش خود را", async () => {
  const page = await read("app/daily-reports/page.tsx");
  const roles = await read("lib/auth/roles.ts");
  const reviewApi = await read("app/api/reports/[type]/[id]/review/route.ts");
  const migration = await read("supabase/migrations/202608180009_daily_report_collaborators_and_tasks.sql");
  assert.match(page, /showAllReports=\{viewer\.role === "admin"\}/);
  assert.doesNotMatch(roles.match(/manager: new Set<Permission>\(\[[\s\S]*?\]\)/)?.[0] ?? "", /reports:review/);
  assert.match(reviewApi, /reviewer\.role !== "admin"/);
  assert.match(migration, /display_name = 'میلاد'/);
  assert.match(migration, /public\.current_app_role\(\) = 'admin'/);
  assert.match(migration, /employee_id = public\.current_employee_id\(\)/);
});

test("لیست مشترک کارهای روزانه در داشبورد قابل افزودن و تکمیل است", async () => {
  const dashboardPage = await read("app/dashboard/page.tsx");
  const dashboard = await read("components/dashboard-view.tsx");
  const board = await read("components/daily-task-board.tsx");
  const api = await read("app/api/daily-tasks/route.ts");
  const migration = await read("supabase/migrations/202608180009_daily_report_collaborators_and_tasks.sql");
  assert.match(dashboardPage, /from\("daily_tasks"\)/);
  assert.match(dashboard, /DailyTaskBoard/);
  assert.match(board, /کارهای امروز/);
  assert.match(board, /در حال انجام/);
  assert.match(board, /انجام‌شده/);
  assert.match(board, /method: "POST"/);
  assert.match(board, /method: "PATCH"/);
  assert.match(api, /from\("daily_tasks"\)\.insert/);
  assert.match(api, /from\("daily_tasks"\)\.update/);
  assert.match(migration, /create table public\.daily_tasks/);
  assert.match(migration, /daily_tasks_select/);
  assert.match(dashboardPage, /is\("completed_at", null\)/);
  assert.match(dashboard, /showCompleted=\{false\}/);
});

test("آرشیو کارهای روزانه صفحه‌بندی شده و از داشبورد جدا است", async () => {
  const page = await read("app/daily-tasks/page.tsx");
  const archive = await read("components/daily-tasks-archive.tsx");
  const api = await read("app/api/daily-tasks/route.ts");
  const shell = await read("components/app-shell.tsx");
  assert.match(page, /DailyTasksArchive/);
  assert.match(archive, /pageSize = 20/);
  assert.match(archive, /انجام‌نشده/);
  assert.match(archive, /انجام‌شده/);
  assert.match(api, /scope === "all"/);
  assert.match(api, /\.range\(/);
  assert.match(shell, /href: "\/daily-tasks"/);
});

test("فیلتر کارمند و لوکیشن و حذف گزارش فقط برای مدیر اصلی است", async () => {
  const list = await read("components/report-list-view.tsx");
  const api = await read("app/api/reports/[type]/[id]/review/route.ts");
  assert.match(list, /employeeFilter/);
  assert.match(list, /locationFilter/);
  assert.match(list, /showAllReports && !maintenance/);
  assert.match(list, /method: "DELETE"/);
  assert.match(api, /export async function DELETE/);
  assert.match(api, /actor\.role !== "admin"/);
  assert.match(api, /deleted_at: new Date/);
  assert.match(api, /action: "report\.deleted"/);
});

test("گردش دستگاه با تعمیرکار دو لینک تأیید امن دارد", async () => {
  const page = await read("app/technicians/page.tsx");
  const view = await read("components/technician-jobs-view.tsx");
  const token = await read("lib/technician-confirmations/token.ts");
  const publicApi = await read("app/api/technician-confirmations/[token]/route.ts");
  const migration = await read("supabase/migrations/202608180010_technician_handoffs.sql");
  const proxy = await read("proxy.ts");
  assert.match(page, /from\("technician_jobs"\)/);
  assert.match(view, /لینک تحویل/);
  assert.match(view, /لینک بازگشت/);
  assert.match(token, /randomBytes\(32\)/);
  assert.match(publicApi, /confirm_technician_handover/);
  assert.match(migration, /create table public\.technician_jobs/);
  assert.match(migration, /create table public\.technician_job_confirmations/);
  assert.match(migration, /security definer/);
  assert.match(proxy, /technician-confirm/);
});

test("ارجاع‌های تعمیرکار برای ثبت‌کننده خصوصی و برای میلاد کامل است", async () => {
  const page = await read("app/technicians/page.tsx");
  const confirmationApi = await read("app/api/technician-jobs/[id]/confirmation/route.ts");
  const migration = await read("supabase/migrations/202608180012_private_technician_jobs.sql");
  assert.match(page, /viewer\.role !== "admin"/);
  assert.match(page, /eq\("created_by", viewer\.id\)/);
  assert.match(confirmationApi, /job\.created_by !== actorId/);
  assert.match(migration, /created_by = auth\.uid\(\) or public\.current_app_role\(\) = 'admin'/);
});

test("پنل کاربری تغییر ایمیل و رمز و تصویر پروفایل را پشتیبانی می‌کند", async () => {
  const page = await read("app/profile/page.tsx");
  const view = await read("components/profile-settings-view.tsx");
  const avatarApi = await read("app/api/profile/avatar/route.ts");
  const migration = await read("supabase/migrations/202608180011_profile_avatars.sql");
  assert.match(page, /ProfileSettingsView/);
  assert.match(view, /auth\.updateUser\(\{ email/);
  assert.match(view, /auth\.updateUser\(\{ password/);
  assert.match(view, /type="file"/);
  assert.match(avatarApi, /storage\.from\("profile-avatars"\)\.upload/);
  assert.match(migration, /'profile-avatars'/);
});

test("پروژه اندروید MinePlus امن و آماده Android Studio است", async () => {
  const manifest = await read("android/app/src/main/AndroidManifest.xml");
  const activity = await read("android/app/src/main/java/app/mineplus/MainActivity.java");
  const gradle = await read("android/app/build.gradle.kts");
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:name="android\.permission\.INTERNET"/);
  assert.match(activity, /https:\/\/list-mine\.vercel\.app\/dashboard/);
  assert.match(activity, /onShowFileChooser/);
  assert.match(activity, /setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/);
  assert.match(activity, /setSaveFormData\(false\)/);
  assert.match(activity, /registerDefaultNetworkCallback/);
  assert.match(activity, /onNewIntent/);
  assert.match(manifest, /android\.permission\.ACCESS_NETWORK_STATE/);
  assert.match(gradle, /applicationId = "app\.mineplus"/);
  assert.match(gradle, /isMinifyEnabled = true/);
});

test("API برای اپ بومی توکن Bearer امن را می‌پذیرد", async () => {
  const serverClient = await read("lib/supabase/server.ts");
  const proxy = await read("proxy.ts");
  assert.match(serverClient, /authorization\?\.startsWith\("Bearer "\)/);
  assert.match(serverClient, /global: \{ headers: \{ Authorization: authorization \} \}/);
  assert.match(proxy, /\(\?!api\//);
});

test("در منوی موبایل، گزارش دکمه اصلی است و تعمیرات جای روزانه قرار دارد", async () => {
  const shell = await read("components/app-shell.tsx");
  assert.match(shell, /href="\/maintenance\/new" className=\{active\("\/maintenance"\)[\s\S]*?<span>تعمیرات<\/span>/);
  assert.match(shell, /href="\/daily-reports\/new" className=\{`mobile-nav-primary[\s\S]*?<em>گزارش<\/em>/);
  assert.doesNotMatch(shell, /<span>روزانه<\/span>/);
  assert.ok(shell.indexOf('{ href: "/maintenance"') < shell.indexOf('{ href: "/daily-reports"'));
});

test("PWA روی Android و iOS نصب‌پذیر و دارای fallback آفلاین است", async () => {
  const layout = await read("app/layout.tsx");
  const manifest = await read("app/manifest.ts");
  const registration = await read("components/pwa-registration.tsx");
  const worker = await read("public/sw.js");
  const proxy = await read("proxy.ts");
  assert.match(layout, /appleWebApp/);
  assert.match(layout, /apple-mobile-web-app-capable/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(manifest, /mineplus-maskable-512\.png/);
  assert.match(registration, /serviceWorker\.register\("\/sw\.js"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(proxy, /"\/offline"/);
  assert.match(proxy, /sw\.js/);
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
  assert.match(detail, /تحویل داده‌شده/);
  assert.match(createCustomerApi, /from\("customers"\)\.insert/);
  assert.match(itemApi, /from\("customer_repair_items"\)\.insert/);
  assert.match(deliveryApi, /type: "delivery"/);
  assert.match(migration, /create table public\.customers/);
  assert.match(migration, /create table public\.customer_repair_items/);
  assert.match(migration, /alter table public\.customers enable row level security/);
});

test("مشتری دریافت و تحویل وسیله را با لینک امن و یک‌بارمصرف تأیید می‌کند", async () => {
  const detailPage = await read("app/customers/[id]/page.tsx");
  const detail = await read("components/customer-detail-view.tsx");
  const publicPage = await read("app/confirm/[token]/page.tsx");
  const publicApi = await read("app/api/confirmations/[token]/route.ts");
  const token = await read("lib/customer-confirmations/token.ts");
  const migration = await read("supabase/migrations/202608080007_customer_handover_confirmations.sql");
  const proxy = await read("proxy.ts");
  assert.match(detailPage, /from\("customer_handover_confirmations"\)/);
  assert.match(detail, /لینک تأیید دریافت/);
  assert.match(detail, /ساخت لینک تحویل/);
  assert.match(publicPage, /hashCustomerConfirmationToken/);
  assert.match(publicApi, /confirm_customer_handover/);
  assert.match(token, /randomBytes\(32\)/);
  assert.match(token, /createHash\("sha256"\)/);
  assert.match(migration, /unique \(item_id, type\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set status = 'delivered', delivered_at = confirmed_time/);
  assert.match(migration, /revoke all on function public\.confirm_customer_handover/);
  assert.match(proxy, /pathname\.startsWith\("\/confirm\/"\)/);
});

test("ثبت تعمیرات فقط مشتری، وسیله و تعداد را در یک پذیرش واقعی ذخیره می‌کند", async () => {
  const page = await read("app/maintenance/new/page.tsx");
  const listPage = await read("app/maintenance/page.tsx");
  const form = await read("components/maintenance-intake-form.tsx");
  const api = await read("app/api/maintenance-intakes/route.ts");
  const migration = await read("supabase/migrations/202608090008_repair_intakes_and_quantities.sql");
  assert.match(page, /MaintenanceIntakeForm/);
  assert.match(listPage, /from\("customer_repair_intakes"\)/);
  assert.match(form, /مشتری جدید/);
  assert.match(form, /نام وسیله/);
  assert.match(form, /تعداد/);
  assert.doesNotMatch(form, /اقدام انجام‌شده|شرح فنی|شرح وضعیت/);
  assert.match(api, /from\("customer_repair_intakes"\)\.insert/);
  assert.match(api, /from\("customer_repair_items"\)\.insert/);
  assert.match(api, /intakeId: intake\.id/);
  assert.match(migration, /create table public\.customer_repair_intakes/);
  assert.match(migration, /add column quantity integer/);
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

test("اپ اندروید MinePlus یک اپ کامل بومی است و WebView ندارد", async () => {
  const appConfig = await read("mobile/app.config.ts");
  const layout = await read("mobile/src/app/(tabs)/_layout.tsx");
  const androidManifest = await read("mobile/android/app/src/main/AndroidManifest.xml");
  const mainActivity = await read("mobile/android/app/src/main/java/app/mineplus/MainActivity.kt");
  const packageJson = await read("mobile/package.json");
  const source = `${appConfig}\n${layout}\n${androidManifest}\n${mainActivity}\n${packageJson}`;
  assert.match(appConfig, /package: "app\.mineplus"/);
  assert.match(packageJson, /"react-native": "0\.86\.2"/);
  assert.match(layout, /name="maintenance"[\s\S]*name="report"/);
  assert.match(layout, /title: "گزارش"/);
  assert.doesNotMatch(source, /android\.webkit\.WebView|react-native-webview|<WebView/);
});

test("اپ بومی همه بخش‌های عملیاتی اصلی را دارد", async () => {
  for (const path of [
    "mobile/src/app/(tabs)/index.tsx",
    "mobile/src/app/(tabs)/maintenance.tsx",
    "mobile/src/app/(tabs)/report.tsx",
    "mobile/src/app/(tabs)/history.tsx",
    "mobile/src/app/tasks.tsx",
    "mobile/src/app/customers.tsx",
    "mobile/src/app/customer/[id].tsx",
    "mobile/src/app/technicians.tsx",
    "mobile/src/app/employees.tsx",
    "mobile/src/app/review.tsx",
    "mobile/src/app/activity.tsx",
    "mobile/src/app/profile.tsx",
  ]) assert.ok((await read(path)).length > 100, `native screen missing: ${path}`);
});

test("آپدیت داخل برنامه و Google Play هر دو پیکربندی شده‌اند", async () => {
  const ota = await read("mobile/src/components/update-gate.tsx");
  const config = await read("mobile/app.config.ts");
  const gradle = await read("mobile/android/app/build.gradle");
  const activity = await read("mobile/android/app/src/main/java/app/mineplus/MainActivity.kt");
  assert.match(ota, /checkForUpdateAsync/);
  assert.match(ota, /fetchUpdateAsync/);
  assert.match(ota, /reloadAsync/);
  assert.match(config, /runtimeVersion: \{ policy: "appVersion" \}/);
  assert.match(gradle, /com\.google\.android\.play:app-update-ktx:2\.1\.0/);
  assert.match(activity, /AppUpdateManagerFactory/);
  assert.match(activity, /AppUpdateType\.IMMEDIATE/);
});
