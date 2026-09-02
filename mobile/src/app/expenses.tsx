import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Empty, ErrorBanner, Field, Header, Screen, SuccessBanner } from "@/components/ui";
import { JalaliPicker, type JalaliValue } from "@/components/jalali-picker";
import { colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { faNumber } from "@/lib/format";

type ExpenseEmployee = { id: string; fullName: string; avatarUrl: string | null };
type ExpenseRecord = { id: string; employeeId: string; employeeName: string; avatarUrl: string | null; expenseDate: string; description: string; amount: number; invoiceUrl: string | null; createdAt: string };
type ExpensePayload = { employees: ExpenseEmployee[]; expenses: ExpenseRecord[]; isAdmin: boolean };

export default function ExpensesScreen() {
  const { employee } = useAuth();
  const [data, setData] = useState<ExpensePayload>({ employees: [], expenses: [], isAdmin: false });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState<JalaliValue>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoice, setInvoice] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await apiFetch<ExpensePayload>("/api/expenses", { cacheKey: "expenses" });
      setData(payload);
      if (!payload.isAdmin) setSelectedEmployeeId(payload.employees[0]?.id ?? null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "دریافت مخارج انجام نشد."); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const groups = useMemo(() => data.employees.map((item) => {
    const items = data.expenses.filter((expense) => expense.employeeId === item.id);
    return { ...item, items, total: items.reduce((sum, expense) => sum + expense.amount, 0) };
  }).sort((a, b) => b.total - a.total), [data]);
  const selectedGroup = groups.find((group) => group.id === selectedEmployeeId) ?? null;
  const ownGroup = groups.find((group) => group.id === employee?.id) ?? null;
  const total = data.isAdmin ? groups.reduce((sum, group) => sum + group.total, 0) : ownGroup?.total ?? 0;

  async function pickInvoice() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("برای انتخاب فاکتور اجازه دسترسی به تصاویر لازم است."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .78, allowsEditing: false });
    if (!result.canceled) setInvoice(result.assets[0]);
  }

  async function submit() {
    if (!date || description.trim().length < 2 || Number(amount) <= 0) { setError("تاریخ، مبلغ و شرح هزینه را کامل کنید."); return; }
    setPending(true); setError(""); setSuccess("");
    try {
      const body = new FormData();
      body.append("year", String(date.year)); body.append("month", String(date.month)); body.append("day", String(date.day));
      body.append("description", description); body.append("amount", amount);
      if (invoice) body.append("invoice", { uri: invoice.uri, name: invoice.fileName ?? "invoice.jpg", type: invoice.mimeType ?? "image/jpeg" } as never);
      await apiFetch("/api/expenses", { method: "POST", body });
      setDate(null); setDescription(""); setAmount(""); setInvoice(null); setFormOpen(false); setSuccess("هزینه با موفقیت ثبت شد.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت هزینه انجام نشد."); }
    finally { setPending(false); }
  }

  return <Screen refreshing={refreshing} onRefresh={load}>
    <Header title="مخارج" subtitle={data.isAdmin ? "جمع و ریز مخارج کارمندان" : "ثبت و مشاهده هزینه‌های شما"} action={<Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></Pressable>} />
    {error ? <ErrorBanner message={error} /> : null}{success ? <SuccessBanner message={success} /> : null}
    <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons name="wallet-outline" size={25} color={colors.success} /></View><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{data.isAdmin ? "جمع کل مخارج" : "جمع مخارج من"}</Text><Text style={styles.summaryValue}>{faNumber(total.toLocaleString("en-US"))} تومان</Text></View><Text style={styles.summaryCount}>{faNumber(data.isAdmin ? data.expenses.length : ownGroup?.items.length ?? 0)} مورد</Text></View>
    {employee ? <Button title={formOpen ? "بستن فرم" : "ثبت هزینه جدید"} icon={formOpen ? "close" : "add"} tone={formOpen ? "secondary" : "primary"} onPress={() => { setFormOpen((value) => !value); setError(""); }} /> : null}
    {formOpen ? <Card style={styles.formCard}><Text style={styles.sectionTitle}>هزینه جدید</Text><Text style={styles.label}>تاریخ هزینه</Text><JalaliPicker value={date} onChange={setDate} /><Field label="مبلغ (تومان)" value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, "").slice(0, 12))} keyboardType="numeric" /><Field label="برای چه موردی هزینه شده؟" value={description} onChangeText={setDescription} multiline /><Button title={invoice ? "تغییر تصویر فاکتور" : "افزودن تصویر فاکتور"} icon="image-outline" tone="secondary" onPress={pickInvoice} />{invoice ? <View style={styles.invoiceSelected}><Ionicons name="checkmark-circle" size={19} color={colors.success} /><Text numberOfLines={1}>{invoice.fileName ?? "تصویر فاکتور انتخاب شد"}</Text></View> : null}<Button title="ثبت هزینه" icon="checkmark" onPress={submit} loading={pending} /></Card> : null}
    {data.isAdmin ? <><Text style={styles.sectionTitle}>مخارج کارمندان</Text><View style={styles.people}>{groups.map((group) => <Pressable key={group.id} onPress={() => setSelectedEmployeeId(group.id)} style={[styles.person, selectedEmployeeId === group.id && styles.personActive]}><View style={styles.personIcon}><Ionicons name="person-outline" size={22} color={colors.primary} /></View><View style={styles.personCopy}><Text style={styles.personName}>{group.fullName}</Text><Text style={styles.personMeta}>{faNumber(group.items.length)} هزینه ثبت‌شده</Text></View><Text style={styles.personTotal}>{faNumber(group.total.toLocaleString("en-US"))} تومان</Text><Ionicons name="chevron-back" size={18} color={colors.muted} /></Pressable>)}</View></> : null}
    {selectedGroup ? <Card><View style={styles.detailHead}><View><Text style={styles.detailLabel}>ریز مخارج</Text><Text style={styles.detailName}>{selectedGroup.fullName}</Text></View><Text style={styles.detailTotal}>{faNumber(selectedGroup.total.toLocaleString("en-US"))} تومان</Text></View>{selectedGroup.items.length ? selectedGroup.items.map((expense) => <View key={expense.id} style={styles.expense}><View style={styles.expenseTop}><Text style={styles.expenseAmount}>{faNumber(expense.amount.toLocaleString("en-US"))} تومان</Text><Text style={styles.expenseDate}>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(`${expense.expenseDate}T12:00:00`))}</Text></View><Text style={styles.expenseDescription}>{expense.description}</Text>{expense.invoiceUrl ? <Button title="مشاهده فاکتور" icon="receipt-outline" tone="secondary" onPress={() => void Linking.openURL(expense.invoiceUrl!)} /> : <Text style={styles.noInvoice}>بدون فاکتور</Text>}</View>) : <Empty title="هزینه‌ای ثبت نشده است" description="هزینه‌های ثبت‌شده این کارمند اینجا نمایش داده می‌شود." />}</Card> : data.isAdmin ? <Card><Empty title="یک کارمند را انتخاب کنید" description="برای مشاهده ریز مخارج روی پروفایل او بزنید." /></Card> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  summary: { minHeight: 94, padding: 15, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  summaryIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }, summaryCopy: { flex: 1, alignItems: "flex-end" }, summaryLabel: { color: colors.muted, fontSize: 11 }, summaryValue: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 4 }, summaryCount: { color: colors.muted, fontSize: 11 },
  formCard: { borderColor: "#C9DDCE", backgroundColor: "#F8FBF8" }, sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "right" }, label: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "right" }, invoiceSelected: { padding: 10, borderRadius: 12, backgroundColor: colors.successSoft, flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  people: { gap: 9 }, person: { minHeight: 72, padding: 11, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, personActive: { borderColor: colors.success, backgroundColor: colors.successSoft }, personIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }, personCopy: { flex: 1, alignItems: "flex-end" }, personName: { color: colors.text, fontWeight: "900" }, personMeta: { color: colors.muted, fontSize: 10, marginTop: 4 }, personTotal: { color: colors.success, fontSize: 11, fontWeight: "900" },
  detailHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10 }, detailLabel: { color: colors.muted, fontSize: 10, textAlign: "right" }, detailName: { color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "right", marginTop: 3 }, detailTotal: { color: colors.success, fontSize: 13, fontWeight: "900" }, expense: { paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border, gap: 9 }, expenseTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, expenseAmount: { color: colors.text, fontWeight: "900" }, expenseDate: { color: colors.muted, fontSize: 11 }, expenseDescription: { color: colors.text, textAlign: "right", lineHeight: 22 }, noInvoice: { color: colors.muted, fontSize: 11, textAlign: "center", padding: 8, backgroundColor: colors.surfaceMuted, borderRadius: 11 },
});
