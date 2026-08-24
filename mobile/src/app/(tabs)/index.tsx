import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Empty, ErrorBanner, Header, Screen } from "@/components/ui";
import { colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { removeCache } from "@/lib/cache";
import { faNumber, formatDate, statusLabels } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { DailyReport, DailyTask } from "@/lib/types";

type DashboardData = { reports: DailyReport[]; tasks: DailyTask[] };

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({ reports: [], tasks: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [changingTaskId, setChangingTaskId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [{ data: reports }, taskPayload] = await Promise.all([
        supabase.from("daily_reports").select("id, employee_id, report_date, start_time, end_time, location, work_summary, status, submitted_at").is("deleted_at", null).order("submitted_at", { ascending: false }).limit(20),
        apiFetch<{ tasks: DailyTask[] }>("/api/daily-tasks?scope=all&page=1&pageSize=50&status=pending", { cacheKey: "dashboard-tasks" }),
      ]);
      setData({ reports: (reports as DailyReport[] | null) ?? [], tasks: taskPayload.tasks });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "به‌روزرسانی صفحه انجام نشد.");
    } finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pending = data.reports.filter((report) => report.status === "submitted").length;
  const approved = data.reports.filter((report) => report.status === "approved").length;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const todayReports = data.reports.filter((report) => report.report_date === today).length;

  async function completeTask(task: DailyTask) {
    setChangingTaskId(task.id);
    setError("");
    try {
      await apiFetch("/api/daily-tasks", { method: "PATCH", body: JSON.stringify({ id: task.id, completed: true }) });
      setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }));
      await Promise.all([removeCache("dashboard-tasks"), removeCache("tasks-pending"), removeCache("tasks-completed")]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تغییر وضعیت کار انجام نشد.");
    } finally {
      setChangingTaskId("");
    }
  }

  return <Screen refreshing={refreshing} onRefresh={load}>
    <Header title={`سلام ${profile?.display_name ?? ""}`} subtitle="وضعیت واقعی عملیات و کارهای امروز" />
    {error ? <ErrorBanner message={error} /> : null}
    <View style={styles.stats}>
      <Stat icon="document-text-outline" label="گزارش امروز" value={todayReports} color={colors.accent} />
      <Stat icon="time-outline" label="در انتظار" value={pending} color="#F4B34A" />
      <Stat icon="checkmark-circle-outline" label="تأییدشده" value={approved} color="#58B77B" />
    </View>
    <View style={styles.actions}>
      <Link href="/(tabs)/report" asChild><Pressable style={[styles.action, styles.actionPrimary]}><Ionicons name="document-text-outline" size={22} color="#fff" /><Text style={styles.actionPrimaryText}>ثبت گزارش</Text></Pressable></Link>
      <Link href="/(tabs)/maintenance" asChild><Pressable style={styles.action}><Ionicons name="construct-outline" size={22} color={colors.primary} /><Text style={styles.actionText}>ثبت تعمیرات</Text></Pressable></Link>
    </View>
    <Card><View style={styles.sectionHead}><Link href="/tasks" style={styles.link}>مشاهده همه</Link><View style={styles.sectionTitleRow}><View style={styles.countBadge}><Text style={styles.countBadgeText}>{faNumber(data.tasks.length)}</Text></View><View><Text style={styles.sectionTitle}>کارهای باقی‌مانده</Text><Text style={styles.sectionSubtitle}>با لمس هر کار، انجام‌شدن آن ثبت می‌شود.</Text></View></View></View>{data.tasks.length === 0 ? <Empty title="کاری باقی نمانده است" description="کارهای جدید در این بخش نمایش داده می‌شوند." icon="checkmark-done-outline" /> : data.tasks.slice(0, 5).map((task, index) => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false, busy: changingTaskId === task.id }} disabled={changingTaskId === task.id} onPress={() => void completeTask(task)} style={({ pressed }) => [styles.task, index === Math.min(data.tasks.length, 5) - 1 && styles.taskLast, pressed && styles.taskPressed]} key={task.id}><View style={styles.taskCheck}><Ionicons name={changingTaskId === task.id ? "hourglass-outline" : "ellipse-outline"} size={17} color={colors.success} /></View><View style={styles.taskCopy}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{formatDate(task.task_date)}</Text></View><Ionicons name="chevron-back" size={17} color={colors.muted} /></Pressable>)}</Card>
    <Card><View style={styles.sectionHead}><Link href="/(tabs)/history" style={styles.link}>سوابق</Link><View><Text style={styles.sectionTitle}>آخرین گزارش‌ها</Text><Text style={styles.sectionSubtitle}>آخرین اطلاعات ثبت‌شده</Text></View></View>{data.reports.length === 0 ? <Empty title="هنوز گزارشی ثبت نشده" description="پس از ثبت نخستین گزارش این قسمت تکمیل می‌شود." /> : data.reports.slice(0, 4).map((report) => <View key={report.id} style={styles.report}><View style={styles.reportIcon}><Ionicons name="document-text-outline" size={20} color={colors.primary} /></View><View style={styles.reportCopy}><Text numberOfLines={2} style={styles.reportTitle}>{report.work_summary}</Text><Text style={styles.reportMeta}>{report.location} · {formatDate(report.report_date)}</Text></View><Badge text={statusLabels[report.status]} tone={report.status === "approved" ? "success" : report.status === "submitted" ? "blue" : "warning"} /></View>)}</Card>
  </Screen>;
}

function Stat({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string }) { return <Card style={styles.stat}><View style={[styles.statIcon, { backgroundColor: `${color}2A` }]}><Ionicons name={icon} size={21} color={color === colors.accent ? colors.primary : color} /></View><Text style={styles.statValue}>{faNumber(value)}</Text><Text style={styles.statLabel}>{label}</Text></Card>; }

const styles = StyleSheet.create({
  stats: { flexDirection: "row-reverse", gap: 9 }, stat: { flex: 1, padding: 12, gap: 5 }, statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" }, statValue: { fontSize: 23, fontWeight: "900", color: colors.text, textAlign: "right" }, statLabel: { fontSize: 10, color: colors.muted, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 10 }, action: { flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary }, actionText: { color: colors.primary, fontWeight: "800" }, actionPrimaryText: { color: "#fff", fontWeight: "800" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { fontWeight: "900", fontSize: 17, color: colors.text, textAlign: "right" }, sectionSubtitle: { color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 3 }, link: { color: colors.success, fontWeight: "800", fontSize: 12 },
  sectionTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, countBadge: { minWidth: 31, height: 31, paddingHorizontal: 8, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.warningSoft }, countBadgeText: { color: colors.warning, fontWeight: "900", fontSize: 11 },
  task: { minHeight: 67, flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, taskLast: { borderBottomWidth: 0 }, taskPressed: { opacity: 0.68 }, taskCheck: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.success, backgroundColor: colors.surface }, taskCopy: { flex: 1, alignItems: "flex-end" }, taskTitle: { color: colors.text, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, taskMeta: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  report: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, reportIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }, reportCopy: { flex: 1, alignItems: "flex-end" }, reportTitle: { color: colors.text, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, reportMeta: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
});
