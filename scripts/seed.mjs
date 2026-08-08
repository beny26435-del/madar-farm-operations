import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !defaultPassword) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL، SUPABASE_SERVICE_ROLE_KEY و SEED_DEFAULT_PASSWORD الزامی هستند.");
}

if (defaultPassword.length < 12) {
  throw new Error("رمز اولیه باید دست‌کم ۱۲ نویسه باشد.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  { email: "milad@madar.ir", name: "میلاد", role: "manager", code: "MGR-001", mobile: "+989100000002" },
];

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error("تعداد کاربران برای جست‌وجوی امن بیش از حد انتظار است.");
}

for (const account of accounts) {
  let user = await findUser(account.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      phone: account.mobile,
      password: defaultPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { display_name: account.name },
    });
    if (error) throw error;
    user = data.user;
  } else if (user.phone !== account.mobile || user.user_metadata?.display_name !== account.name) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      phone: account.mobile,
      phone_confirm: true,
      user_metadata: { ...user.user_metadata, display_name: account.name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: account.name,
    role: account.role,
    is_active: true,
  });
  if (profileError) throw profileError;

  const { error: employeeError } = await supabase.from("employees").upsert({
    profile_id: user.id,
    personnel_code: account.code,
    full_name: account.name,
    mobile: account.mobile,
    status: "active",
  }, { onConflict: "profile_id" });
  if (employeeError) throw employeeError;
}

console.log("حساب مدیر عملیات با موفقیت همگام شد.");
