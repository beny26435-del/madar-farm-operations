import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "./roles";
import type { Viewer } from "./types";

export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_path, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.is_active || !isAppRole(profile.role)) return null;

  return {
    id: profile.id,
    displayName: profile.display_name,
    role: profile.role,
    avatarPath: profile.avatar_path,
  };
}

export async function requireViewer() {
  if (!isSupabaseConfigured()) redirect("/login?error=configuration");
  const viewer = await getViewer();
  if (!viewer) redirect("/login?error=session");
  return viewer;
}
