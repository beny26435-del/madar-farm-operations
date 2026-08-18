import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DailyTasksArchive } from "@/components/daily-tasks-archive";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "کارهای روزانه" };
export const dynamic = "force-dynamic";

export default async function DailyTasksPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: tasks, count, error } = await supabase.from("daily_tasks").select("id, title, task_date, created_by, completed_by, completed_at, created_at", { count: "exact" }).is("completed_at", null).order("task_date", { ascending: false }).order("created_at", { ascending: false }).range(0, 19);
  return <AppShell viewer={viewer}><DailyTasksArchive initialTasks={tasks ?? []} initialCount={count ?? 0} loadError={Boolean(error)} /></AppShell>;
}
