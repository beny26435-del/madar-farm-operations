import Constants from "expo-constants";

type AppExtra = {
  apiUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const config = {
  apiUrl: extra.apiUrl ?? "https://list-mine.vercel.app",
  supabaseUrl: extra.supabaseUrl ?? "",
  supabasePublishableKey: extra.supabasePublishableKey ?? "",
};

export function assertConfig() {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new Error("تنظیمات اتصال برنامه کامل نیست.");
  }
}
