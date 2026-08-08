import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/202608080001_phase3_identity_and_core_schema.sql", import.meta.url);

async function render(pathname) {
  const { default: worker } = await import(`${workerUrl.href}?test=${Date.now()}-${Math.random()}`);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("صفحه ورود بدون اطلاعات ثابت نمایش داده می‌شود", async () => {
  const response = await render("/login");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/i);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const html = await response.text();
  assert.match(html, /ورود به سامانه مدیریت فارم/);
  assert.doesNotMatch(html, /name="identifier"[^>]+value=/);
  assert.doesNotMatch(html, /name="password"[^>]+value=/);
});

for (const path of ["/", "/dashboard", "/daily-reports", "/maintenance", "/employees", "/employees/new"]) {
  test(`مسیر ${path} بدون تنظیمات بسته است`, async () => {
    const response = await render(path);
    assert.ok([302, 303, 307, 308].includes(response.status));
    assert.match(response.headers.get("location") ?? "", /\/login\?error=(configuration|session)$/);
  });
}

test("migration قواعد هویتی و RLS را حفظ می‌کند", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create type public\.app_role as enum \('admin', 'manager', 'employee'\)/);
  assert.match(sql, /daily_reports_employee_date_shift_live_key/);
  assert.match(sql, /num_nonnulls\(technician_employee_id, nullif\(trim\(technician_name\), ''\)\) = 1/);
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /alter table public\.report_revisions enable row level security/);
  assert.match(sql, /Report revisions are immutable/);
  assert.match(sql, /revoke all on all tables in schema public from anon/);
});
