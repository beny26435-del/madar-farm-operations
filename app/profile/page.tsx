import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileSettingsView } from "@/components/profile-settings-view";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "پنل کاربری" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";
  return <AppShell viewer={viewer}><ProfileSettingsView viewer={viewer} email={email} /></AppShell>;
}
