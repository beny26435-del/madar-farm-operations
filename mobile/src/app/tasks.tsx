import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Empty, ErrorBanner, Field, Header, Screen, SuccessBanner } from "@/components/ui";
import { colors } from "@/constants/colors";
import { apiFetch } from "@/lib/api";
import { removeCache } from "@/lib/cache";
import { faNumber, formatDate } from "@/lib/format";
import type { DailyTask } from "@/lib/types";

type TaskPayload = { tasks: DailyTask[]; count: number };
type TaskFilter = "pending" | "completed";

export default function TasksScreen() {
  const [pendingTasks, setPendingTasks] = useState<DailyTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<DailyTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [changingId, setChangingId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [pendingPayload, completedPayload] = await Promise.all([
        apiFetch<TaskPayload>("/api/daily-tasks?scope=all&page=1&pageSize=50&status=pending", { cacheKey: "tasks-pending" }),
        apiFetch<TaskPayload>("/api/daily-tasks?scope=all&page=1&pageSize=50&status=completed", { cacheKey: "tasks-completed" }),
      ]);
      setPendingTasks(pendingPayload.tasks);
      setCompletedTasks(completedPayload.tasks);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت فهرست کارها ممکن نشد.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function add() {
    const cleanTitle = title.trim();
    setError("");
    setSuccess("");
    if (cleanTitle.length < 2) return setError("عنوان کار را وارد کنید.");
    setSubmitting(true);
    try {
      const data = await apiFetch<{ task: DailyTask; message: string }>("/api/daily-tasks", { method: "POST", body: JSON.stringify({ title: cleanTitle }) });
      setPendingTasks((current) => [data.task, ...current]);
      setTitle("");
      setFilter("pending");
      setSuccess(data.message);
      await Promise.all([removeCache("tasks-pending"), removeCache("dashboard-tasks")]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "افزودن کار انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(task: DailyTask, completed: boolean) {
    setChangingId(task.id);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ task: DailyTask; message: string }>("/api/daily-tasks", { method: "PATCH", body: JSON.stringify({ id: task.id, completed }) });
      if (completed) {
        setPendingTasks((current) => current.filter((item) => item.id !== task.id));
        setCompletedTasks((current) => [data.task, ...current.filter((item) => item.id !== task.id)]);
      } else {
        setCompletedTasks((current) => current.filter((item) => item.id !== task.id));
        setPendingTasks((current) => [data.task, ...current.filter((item) => item.id !== task.id)]);
      }
      setSuccess(data.message);
      await Promise.all([removeCache("tasks-pending"), removeCache("tasks-completed"), removeCache("dashboard-tasks")]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تغییر وضعیت کار انجام نشد.");
    } finally {
      setChangingId("");
    }
  }

  const visibleTasks = useMemo(() => filter === "pending" ? pendingTasks : completedTasks, [completedTasks, filter, pendingTasks]);

  return <Screen refreshing={refreshing} onRefresh={load}>
    <Header title="کارهای روزانه" subtitle="فهرست مشترک و همیشه در دسترس تیم" action={<Pressable accessibilityRole="button" accessibilityLabel="بازگشت" hitSlop={12} onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={colors.text} /></Pressable>} />
    {error ? <ErrorBanner message={error} /> : null}
    {success ? <SuccessBanner message={success} /> : null}

    <Card style={styles.addCard}>
      <View style={styles.cardHeading}>
        <View style={styles.headingIcon}><Ionicons name="add" size={21} color={colors.primary} /></View>
        <View style={styles.headingCopy}><Text style={styles.cardTitle}>افزودن کار</Text><Text style={styles.cardSubtitle}>بعد از ثبت، همه اعضای تیم آن را می‌بینند.</Text></View>
      </View>
      <Field label="عنوان کار" value={title} onChangeText={setTitle} />
      <Button title="افزودن به فهرست" icon="add-circle-outline" onPress={add} loading={submitting} disabled={title.trim().length < 2} />
    </Card>

    <View style={styles.summary}>
      <Summary icon="time-outline" label="در حال انجام" value={pendingTasks.length} tone="warning" />
      <Summary icon="checkmark-done-outline" label="انجام شده" value={completedTasks.length} tone="success" />
    </View>

    <View style={styles.segment}>
      <FilterButton title="در حال انجام" count={pendingTasks.length} active={filter === "pending"} onPress={() => setFilter("pending")} />
      <FilterButton title="انجام شده" count={completedTasks.length} active={filter === "completed"} onPress={() => setFilter("completed")} />
    </View>

    <Card style={styles.listCard}>
      {visibleTasks.length === 0 ? <Empty title={filter === "pending" ? "کاری باقی نمانده است" : "کاری انجام نشده است"} description={filter === "pending" ? "کار جدید را از بخش بالا اضافه کنید." : "کارهای تکمیل‌شده در این قسمت قرار می‌گیرند."} icon={filter === "pending" ? "checkmark-done-outline" : "archive-outline"} /> : visibleTasks.map((task, index) => <TaskRow key={task.id} task={task} completed={filter === "completed"} busy={changingId === task.id} last={index === visibleTasks.length - 1} onPress={() => void changeStatus(task, filter === "pending")} />)}
    </Card>
  </Screen>;
}

function Summary({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; tone: "warning" | "success" }) {
  return <View style={[styles.summaryItem, tone === "success" ? styles.summarySuccess : styles.summaryWarning]}><Ionicons name={icon} size={20} color={tone === "success" ? colors.success : colors.warning} /><View><Text style={styles.summaryValue}>{faNumber(value)}</Text><Text style={styles.summaryLabel}>{label}</Text></View></View>;
}

function FilterButton({ title, count, active, onPress }: { title: string; count: number; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.segmentButton, active && styles.segmentButtonActive, pressed && styles.rowPressed]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{title}</Text><View style={[styles.segmentCount, active && styles.segmentCountActive]}><Text style={[styles.segmentCountText, active && styles.segmentCountTextActive]}>{faNumber(count)}</Text></View></Pressable>;
}

function TaskRow({ task, completed, busy, last, onPress }: { task: DailyTask; completed: boolean; busy: boolean; last: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: completed, busy }} accessibilityLabel={`${task.title}، ${completed ? "انجام شده" : "در حال انجام"}`} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.task, last && styles.taskLast, pressed && styles.rowPressed, busy && styles.taskBusy]}>
    <View style={[styles.check, completed && styles.checkDone]}>{busy ? <Ionicons name="hourglass-outline" size={17} color={colors.muted} /> : <Ionicons name={completed ? "checkmark" : "ellipse-outline"} size={completed ? 18 : 16} color={completed ? "#fff" : colors.success} />}</View>
    <View style={styles.taskCopy}><Text style={[styles.taskTitle, completed && styles.taskTitleDone]}>{task.title}</Text><Text style={styles.taskMeta}>{formatDate(task.task_date)}</Text></View>
    <Ionicons name={completed ? "refresh-outline" : "chevron-back"} size={18} color={colors.muted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  addCard: { gap: 15 },
  cardHeading: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  headingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  headingCopy: { flex: 1, alignItems: "flex-end" },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "right" },
  cardSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 3, textAlign: "right", writingDirection: "rtl" },
  summary: { flexDirection: "row-reverse", gap: 10 },
  summaryItem: { flex: 1, minHeight: 82, borderRadius: 19, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderWidth: 1 },
  summaryWarning: { backgroundColor: colors.warningSoft, borderColor: "#F3DDBA" },
  summarySuccess: { backgroundColor: colors.successSoft, borderColor: "#CAE7D4" },
  summaryValue: { color: colors.text, fontSize: 21, fontWeight: "900", textAlign: "right" },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "right" },
  segment: { flexDirection: "row-reverse", padding: 4, borderRadius: 17, backgroundColor: colors.surfaceMuted },
  segmentButton: { flex: 1, minHeight: 46, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 },
  segmentButtonActive: { backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  segmentText: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  segmentTextActive: { color: colors.text },
  segmentCount: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(113,128,120,0.12)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segmentCountActive: { backgroundColor: colors.primary },
  segmentCountText: { color: colors.muted, fontSize: 10, fontWeight: "900" },
  segmentCountTextActive: { color: "#fff" },
  listCard: { paddingVertical: 5, paddingHorizontal: 16, gap: 0, overflow: "hidden" },
  task: { minHeight: 76, flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  taskLast: { borderBottomWidth: 0 },
  taskBusy: { opacity: 0.55 },
  rowPressed: { opacity: 0.72 },
  check: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: colors.success, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  taskCopy: { flex: 1, alignItems: "flex-end" },
  taskTitle: { color: colors.text, fontWeight: "800", lineHeight: 23, textAlign: "right", writingDirection: "rtl" },
  taskTitleDone: { color: colors.muted, textDecorationLine: "line-through" },
  taskMeta: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
});
