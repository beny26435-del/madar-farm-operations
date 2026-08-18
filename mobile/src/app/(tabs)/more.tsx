import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Header, Screen } from "@/components/ui";
import { colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import type { AppRole } from "@/lib/types";
import { roleLabels } from "@/lib/format";

const items = [
  { href: "/tasks", title: "کارهای روزانه", icon: "checkbox-outline", roles: ["admin", "manager", "employee"] },
  { href: "/customers", title: "مشتریان", icon: "people-circle-outline", roles: ["admin", "manager"] },
  { href: "/technicians", title: "تعمیرکاران", icon: "hammer-outline", roles: ["admin", "manager", "employee"] },
  { href: "/employees", title: "کارکنان", icon: "people-outline", roles: ["admin", "manager"] },
  { href: "/review", title: "بررسی گزارش‌ها", icon: "shield-checkmark-outline", roles: ["admin"] },
  { href: "/activity", title: "فعالیت‌ها", icon: "pulse-outline", roles: ["admin", "manager"] },
  { href: "/profile", title: "پنل کاربری", icon: "person-circle-outline", roles: ["admin", "manager", "employee"] },
] as const;

export default function MoreScreen() {
  const { profile } = useAuth();
  return <Screen><Header title="بیشتر" subtitle="دسترسی به تمام بخش‌های MinePlus" /><Card style={styles.profile}><View style={styles.avatar}><Text>{profile?.display_name.slice(0, 1)}</Text></View><View><Text style={styles.name}>{profile?.display_name}</Text><Text style={styles.role}>{profile ? roleLabels[profile.role] : ""}</Text></View></Card><View style={styles.grid}>{items.filter((item) => profile && (item.roles as readonly AppRole[]).includes(profile.role)).map((item) => <Link href={item.href} asChild key={item.href}><Pressable style={styles.item}><View style={styles.icon}><Ionicons name={item.icon} size={25} color={colors.primary} /></View><Text style={styles.itemText}>{item.title}</Text><Ionicons name="chevron-back" size={18} color={colors.muted} /></Pressable></Link>)}</View></Screen>;
}

const styles = StyleSheet.create({ profile: { flexDirection: "row-reverse", alignItems: "center" }, avatar: { width: 55, height: 55, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }, name: { fontWeight: "900", fontSize: 17, textAlign: "right" }, role: { color: colors.muted, marginTop: 4, textAlign: "right" }, grid: { gap: 9 }, item: { minHeight: 68, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }, itemText: { flex: 1, color: colors.text, fontWeight: "800", textAlign: "right" } });
