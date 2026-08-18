import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import type { DailyTask } from "@/lib/types";
import { Button, Card, Empty, ErrorBanner, Field, Header, Screen } from "@/components/ui";
import { colors } from "@/constants/colors";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]); const [title, setTitle] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { setRefreshing(true); try { const data = await apiFetch<{ tasks: DailyTask[] }>("/api/daily-tasks?scope=all&page=1&pageSize=50&status=pending", { cacheKey: "tasks-pending" }); setTasks(data.tasks); } catch (reason) { setError(reason instanceof Error ? reason.message : "دریافت فهرست ممکن نشد."); } finally { setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function add() { if (title.trim().length < 2) return; setPending(true); try { const data = await apiFetch<{ task: DailyTask }>("/api/daily-tasks", { method: "POST", body: JSON.stringify({ title }) }); setTasks((value) => [...value, data.task]); setTitle(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "افزودن کار انجام نشد."); } finally { setPending(false); } }
  async function complete(id: string) { try { await apiFetch("/api/daily-tasks", { method: "PATCH", body: JSON.stringify({ id, completed: true }) }); setTasks((value) => value.filter((task) => task.id !== id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "تغییر وضعیت انجام نشد."); } }
  return <Screen refreshing={refreshing} onRefresh={load}><Header title="کارهای روزانه" subtitle="فهرست مشترک همه اعضای تیم" action={<Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></Pressable>} />{error ? <ErrorBanner message={error} /> : null}<Card><Field label="کار جدید" value={title} onChangeText={setTitle} /><Button title="افزودن به فهرست" icon="add" onPress={add} loading={pending} /></Card><Card>{tasks.length === 0 ? <Empty title="کاری باقی نمانده است" description="کار تازه را از فرم بالا اضافه کنید." icon="checkmark-done-outline" /> : tasks.map((task) => <Pressable key={task.id} onPress={() => complete(task.id)} style={styles.task}><View style={styles.check}><Ionicons name="checkmark" size={18} color={colors.success} /></View><Text style={styles.taskTitle}>{task.title}</Text></Pressable>)}</Card></Screen>;
}
const styles = StyleSheet.create({ task: { flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, check: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: colors.success, alignItems: "center", justifyContent: "center" }, taskTitle: { flex: 1, textAlign: "right", color: colors.text, fontWeight: "700", writingDirection: "rtl" } });
