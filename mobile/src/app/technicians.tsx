import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Empty, ErrorBanner, Field, Header, Screen, SuccessBanner } from "@/components/ui";
import { colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { faNumber, statusLabels } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { RepairItem, TechnicianJob } from "@/lib/types";

const technicianOptions = ["مهندس صادقی", "مهندس افشار", "مهندس کاکاوند", "مهندس احمدی"] as const;
const otherTechnician = "other";

export default function TechniciansScreen() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<TechnicianJob[]>([]);
  const [items, setItems] = useState<RepairItem[]>([]);
  const [section, setSection] = useState<"flow" | "rework">("flow");
  const [technicianSelection, setTechnicianSelection] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    let query = supabase
      .from("technician_jobs")
      .select("id, repair_item_id, technician_name, item_name, customer_name, quantity, status, rework_count, promised_return_at, created_by, created_at")
      .order("created_at", { ascending: false });
    if (profile?.role !== "admin") query = query.eq("created_by", profile?.id ?? "");
    const [{ data: jobData }, { data: itemData }] = await Promise.all([
      query,
      supabase.from("customer_repair_items").select("id, customer_id, intake_id, item_name, quantity, status, received_at, delivered_at").eq("status", "received"),
    ]);
    setJobs((jobData as TechnicianJob[] | null) ?? []);
    setItems((itemData as RepairItem[] | null) ?? []);
    setRefreshing(false);
  }, [profile?.id, profile?.role]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const selectedItem = useMemo(() => items.find((item) => item.id === itemId), [itemId, items]);
  const visibleJobs = useMemo(() => jobs.filter((job) => section === "flow" ? job.status !== "awaiting_rework" : job.status === "returned" || job.status === "awaiting_rework" || job.rework_count > 0), [jobs, section]);

  function selectTechnician(value: string) {
    setTechnicianSelection(value);
    setTechnicianName(value === otherTechnician ? "" : value);
    setError("");
  }

  async function create() {
    if (!itemId || technicianName.trim().length < 2 || Number(quantity) < 1) {
      setError("تعمیرکار، دستگاه و تعداد را کامل کنید.");
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/technician-jobs", { method: "POST", body: JSON.stringify({ repairItemId: itemId, technicianName, quantity: Number(quantity) }) });
      setSuccess("ارجاع به تعمیرکار ثبت شد.");
      setTechnicianSelection("");
      setTechnicianName("");
      setItemId("");
      setQuantity("1");
      void load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ثبت ارجاع انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  async function share(job: TechnicianJob, type: "handover" | "return" | "rework") {
    try {
      const data = await apiFetch<{ confirmationUrl: string }>(`/api/technician-jobs/${job.id}/confirmation`, { method: "POST", body: JSON.stringify({ type }) });
      await Share.share({ message: data.confirmationUrl });
      void load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ساخت لینک انجام نشد.");
    }
  }

  return <Screen refreshing={refreshing} onRefresh={load}>
    <Header title="تعمیرکاران" subtitle={profile?.role === "admin" ? "همه ارجاع‌ها" : "فقط ارجاع‌های ثبت‌شده شما"} action={<Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></Pressable>} />
    {error ? <ErrorBanner message={error} /> : null}
    {success ? <SuccessBanner message={success} /> : null}
    <View style={styles.tabs} accessibilityRole="tablist">
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: section === "flow" }} onPress={() => setSection("flow")} style={[styles.tab, section === "flow" && styles.tabActive]}><Ionicons name="swap-horizontal-outline" size={18} color={section === "flow" ? "#fff" : colors.muted} /><Text style={[styles.tabText, section === "flow" && styles.tabTextActive]}>گردش دستگاه · {faNumber(jobs.filter((job) => job.status !== "awaiting_rework").length)}</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: section === "rework" }} onPress={() => setSection("rework")} style={[styles.tab, section === "rework" && styles.tabActive]}><Ionicons name="return-down-back-outline" size={18} color={section === "rework" ? "#fff" : colors.muted} /><Text style={[styles.tabText, section === "rework" && styles.tabTextActive]}>مرجوعی خراب · {faNumber(jobs.filter((job) => job.status === "returned" || job.status === "awaiting_rework" || job.rework_count > 0).length)}</Text></Pressable>
    </View>
    {section === "flow" ? <Card>
      <Text style={styles.label}>تعمیرکار</Text>
      <View style={styles.technicians}>
        {[...technicianOptions, otherTechnician].map((value) => {
          const selected = technicianSelection === value;
          const label = value === otherTechnician ? "تعمیرکار دیگر" : value;
          return <Pressable key={value} onPress={() => selectTechnician(value)} style={[styles.technician, selected && styles.technicianActive]}>
            <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.success : colors.muted} />
            <Text style={[styles.technicianText, selected && styles.technicianTextActive]}>{label}</Text>
          </Pressable>;
        })}
      </View>
      {technicianSelection === otherTechnician ? <Field label="نام تعمیرکار دیگر" value={technicianName} onChangeText={setTechnicianName} /> : null}
      <Text style={styles.label}>انتخاب دستگاه</Text>
      <View style={styles.items}>{items.map((item) => <Pressable key={item.id} onPress={() => setItemId(item.id)} style={[styles.item, itemId === item.id && styles.itemActive]}><Ionicons name={itemId === item.id ? "checkmark-circle" : "cube-outline"} size={20} color={itemId === item.id ? colors.success : colors.muted} /><Text>{item.item_name} · {faNumber(item.quantity)}</Text></Pressable>)}</View>
      {selectedItem ? <Field label="تعداد" value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, "").slice(0, 3))} keyboardType="numeric" /> : null}
      <Button title="ثبت ارجاع" icon="add" onPress={create} loading={pending} />
    </Card> : null}
    {visibleJobs.length === 0 ? <Card><Empty title={section === "rework" ? "دستگاهی برای مرجوعی نیست" : "ارجاعی ثبت نشده است"} description={section === "rework" ? "دستگاه تحویل‌گرفته‌شده‌ای که هنوز خراب است را از این بخش مرجوع کنید." : "ارجاع جدید ثبت کنید و لینک تحویل را برای تعمیرکار بفرستید."} /></Card> : visibleJobs.map((job) => {
      const actionType = section === "rework" && (job.status === "returned" || job.status === "awaiting_rework") ? "rework" : job.status === "awaiting_handover" ? "handover" : job.status === "with_technician" || job.status === "awaiting_return" ? "return" : null;
      const title = actionType === "handover" ? "ارسال لینک تحویل" : actionType === "return" ? job.status === "with_technician" ? "ساخت لینک تحویل به شما" : "ارسال دوباره لینک تحویل" : actionType === "rework" ? job.status === "returned" ? "مرجوع کردن به تعمیرکار" : "ارسال دوباره لینک مرجوعی" : "";
      return <Card key={job.id}><View style={styles.head}><Badge text={statusLabels[job.status]} tone={job.status === "returned" ? "success" : "warning"} /><View><Text style={styles.title}>{job.technician_name}</Text><Text style={styles.meta}>{job.item_name} · {job.customer_name} · {faNumber(job.quantity)}</Text></View></View>{job.promised_return_at && job.status !== "returned" ? <View style={styles.promised}><Ionicons name="calendar-outline" size={17} color={colors.success} /><Text style={styles.promisedText}>تاریخ تحویل اعلام‌شده: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(job.promised_return_at))}</Text></View> : null}{actionType ? <Button title={title} icon={actionType === "handover" ? "share-social-outline" : "return-down-back-outline"} onPress={() => share(job, actionType)} /> : null}</Card>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  tabs: { padding: 5, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, flexDirection: "row-reverse", gap: 5 },
  tab: { minHeight: 46, flex: 1, paddingHorizontal: 10, borderRadius: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
  tabTextActive: { color: "#fff" },
  label: { fontWeight: "800", fontSize: 13, textAlign: "right" },
  technicians: { gap: 7 },
  technician: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 9, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  technicianActive: { borderColor: colors.success, backgroundColor: colors.successSoft },
  technicianText: { flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right", color: colors.text },
  technicianTextActive: { color: colors.success },
  items: { gap: 7 },
  item: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.border },
  itemActive: { borderColor: colors.success, backgroundColor: colors.successSoft },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "900", fontSize: 16, textAlign: "right" },
  meta: { fontSize: 11, color: colors.muted, textAlign: "right", marginTop: 4 },
  promised: { padding: 11, borderRadius: 13, backgroundColor: colors.successSoft, flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  promisedText: { flex: 1, color: colors.success, fontSize: 11, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
});
