import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";
import { isSupabaseConfigured } from "@/lib/env";
export const metadata: Metadata = { title: "ورود" };
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const setupRequired = !isSupabaseConfigured();
  const initialMessage = error === "session" ? "نشست شما پایان یافته است. دوباره وارد شوید." : null;
  return <LoginView setupRequired={setupRequired} initialMessage={initialMessage} />;
}
