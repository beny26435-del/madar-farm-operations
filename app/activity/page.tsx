import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActivityView, type ActivityItem } from "@/components/activity-view";
import { AppShell } from "@/components/app-shell";
import { hasPermission } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "فعالیت‌ها" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const viewer = await requireViewer();
  if (!hasPermission(viewer.role, "activity:view")) redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: logs, error }, { data: profiles }] = await Promise.all([
    supabase.from("activity_logs").select("id, actor_id, action, entity_type, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, display_name"),
  ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const items: ActivityItem[] = (logs ?? []).map((log) => ({
    ...log,
    actorName: log.actor_id ? names.get(log.actor_id) ?? "کاربر سامانه" : "سامانه",
    metadata: log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata) ? Object.fromEntries(Object.entries(log.metadata).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])) : {},
  }));
  return <AppShell viewer={viewer}><ActivityView items={items} loadError={Boolean(error)} /></AppShell>;
}
