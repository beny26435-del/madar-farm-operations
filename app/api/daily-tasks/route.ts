import { NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(300),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
});

function tehranDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function activeActor() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, is_active").eq("id", actorId).maybeSingle();
  return profile?.is_active ? { actorId, admin } : null;
}

export async function GET(request: Request) {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  if (scope === "all") {
    const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
    const pageSize = Math.max(5, Math.min(50, Number(url.searchParams.get("pageSize")) || 20));
    const status = url.searchParams.get("status") === "completed" ? "completed" : "pending";
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
    let query = actor.admin.from("daily_tasks").select("id, title, task_date, created_by, completed_by, completed_at, created_at", { count: "exact" });
    query = status === "completed" ? query.not("completed_at", "is", null) : query.is("completed_at", null);
    if (search) query = query.ilike("title", `%${search}%`);
    const from = (page - 1) * pageSize;
    const { data: tasks, error, count } = await query.order("task_date", { ascending: false }).order("created_at", { ascending: false }).range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ message: "دریافت کارهای روزانه انجام نشد." }, { status: 500 });
    return NextResponse.json({ tasks: tasks ?? [], count: count ?? 0, page, pageSize });
  }
  const { data: tasks, error } = await actor.admin.from("daily_tasks").select("id, title, task_date, created_by, completed_by, completed_at, created_at").eq("task_date", tehranDate()).is("completed_at", null).order("created_at");
  if (error) return NextResponse.json({ message: "دریافت کارهای امروز انجام نشد." }, { status: 500 });
  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(request: Request) {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "عنوان کار را کامل وارد کنید." }, { status: 400 });

  const { data: task, error } = await actor.admin.from("daily_tasks").insert({
    title: parsed.data.title,
    task_date: tehranDate(),
    created_by: actor.actorId,
  }).select("id, title, task_date, created_by, completed_by, completed_at, created_at").single();
  if (error) return NextResponse.json({ message: "افزودن کار انجام نشد." }, { status: 500 });
  await recordActivity({ actorId: actor.actorId, action: "daily_task.created", entityType: "daily_task", entityId: task.id, metadata: { title: task.title } });
  return NextResponse.json({ task, message: "کار به فهرست امروز اضافه شد." }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await activeActor();
  if (!actor) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "درخواست تغییر کار معتبر نیست." }, { status: 400 });

  const values = parsed.data.completed
    ? { completed_by: actor.actorId, completed_at: new Date().toISOString() }
    : { completed_by: null, completed_at: null };
  const { data: task, error } = await actor.admin.from("daily_tasks").update(values).eq("id", parsed.data.id).select("id, title, task_date, created_by, completed_by, completed_at, created_at").maybeSingle();
  if (error) return NextResponse.json({ message: "تغییر وضعیت کار انجام نشد." }, { status: 500 });
  if (!task) return NextResponse.json({ message: "کار پیدا نشد." }, { status: 404 });
  await recordActivity({ actorId: actor.actorId, action: parsed.data.completed ? "daily_task.completed" : "daily_task.reopened", entityType: "daily_task", entityId: task.id, metadata: { title: task.title } });
  return NextResponse.json({ task, message: parsed.data.completed ? "کار انجام شد." : "کار به فهرست در حال انجام برگشت." });
}
