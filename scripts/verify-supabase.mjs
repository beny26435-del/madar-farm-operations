import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEFAULT_PASSWORD;

assert.ok(url && publishableKey && serviceRoleKey && password, "تنظیمات Supabase کامل نیست.");

const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const [{ count: profileCount, error: profileError }, { count: employeeCount, error: employeeError }, { error: dailyReportError }] = await Promise.all([
  service.from("profiles").select("id", { count: "exact", head: true }),
  service.from("employees").select("id, email", { count: "exact", head: true }),
  service.from("daily_reports").select("id, start_time, end_time, actions_taken, notes", { head: true }),
]);

if (profileError) throw profileError;
if (employeeError) throw employeeError;
if (dailyReportError) throw dailyReportError;
assert.ok(profileCount >= 1);
assert.ok(employeeCount >= 1);

const manager = createClient(url, publishableKey, { auth: { persistSession: false } });
const { error: signInError } = await manager.auth.signInWithPassword({
  email: "milad@madar.ir",
  password,
});
if (signInError) throw signInError;

const [{ data: visibleProfiles, error: visibleProfileError }, { data: visibleEmployees, error: visibleEmployeeError }] = await Promise.all([
  manager.from("profiles").select("id, role"),
  manager.from("employees").select("id, profile_id, email"),
]);

if (visibleProfileError) throw visibleProfileError;
if (visibleEmployeeError) throw visibleEmployeeError;
assert.ok(visibleProfiles.some((profile) => profile.role === "manager"));
assert.ok(visibleEmployees.some((employee) => visibleProfiles.some((profile) => profile.id === employee.profile_id)));
assert.ok(visibleEmployees.every((employee) => employee.email));

await manager.auth.signOut();
console.log("اتصال، شمارش حساب‌ها و محدودیت RLS با موفقیت تأیید شد.");
