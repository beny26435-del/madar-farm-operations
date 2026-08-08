const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getPublicSupabaseEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("تنظیمات اتصال Supabase کامل نیست.");
  }

  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}
