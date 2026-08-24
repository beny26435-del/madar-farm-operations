import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

export function Screen({ children, refreshing, onRefresh, contentStyle }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle> }) {
  return <SafeAreaView edges={["top"]} style={styles.safe}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.screen, contentStyle]} refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{action}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.card, style]}>{children}</View>; }

export function Button({ title, onPress, icon, tone = "primary", disabled, loading, style }: { title: string; onPress: () => void; icon?: ComponentProps<typeof Ionicons>["name"]; tone?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, styles[`button_${tone}`], (disabled || loading) && styles.disabled, pressed && styles.pressed, style]}>{loading ? <ActivityIndicator color={tone === "secondary" ? colors.primary : "#fff"} /> : <>{icon ? <Ionicons name={icon} size={19} color={tone === "secondary" ? colors.primary : "#fff"} /> : null}<Text numberOfLines={1} style={[styles.buttonText, tone === "secondary" && styles.buttonTextSecondary]}>{title}</Text></>}</Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType = "default", secureTextEntry, autoComplete = "off", error }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: "default" | "email-address" | "numeric" | "phone-pad"; secureTextEntry?: boolean; autoComplete?: "off" | "email" | "password" | "new-password"; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA59F" style={[styles.input, multiline && styles.multiline, error && styles.inputError]} textAlign="right" multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize="none" autoCorrect={false} autoComplete={autoComplete} importantForAutofill="noExcludeDescendants" />{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>;
}

export function Empty({ title, description, icon = "file-tray-outline" }: { title: string; description: string; icon?: ComponentProps<typeof Ionicons>["name"] }) { return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.muted} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{description}</Text></View>; }

export function ErrorBanner({ message }: { message: string }) { return <View accessibilityRole="alert" style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={20} color={colors.danger} /><Text style={styles.errorBannerText}>{message}</Text></View>; }
export function SuccessBanner({ message }: { message: string }) { return <View accessibilityRole="alert" style={styles.successBanner}><Ionicons name="checkmark-circle-outline" size={20} color={colors.success} /><Text style={styles.successBannerText}>{message}</Text></View>; }

export function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "success" | "warning" | "danger" | "blue" }) { return <View style={[styles.badge, styles[`badge_${tone}`]]}><Text style={[styles.badgeText, styles[`badgeText_${tone}`]]}>{text}</Text></View>; }

export function LoadingScreen() { return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text>در حال آماده‌سازی MinePlus…</Text></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  screen: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 124, gap: 16 },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 2 },
  headerCopy: { flex: 1, alignItems: "flex-end" },
  title: { color: colors.text, fontSize: 27, lineHeight: 38, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 17, gap: 13, shadowColor: "#15231B", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.055, shadowRadius: 18, elevation: 2 },
  button: { minHeight: 52, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  button_primary: { backgroundColor: colors.primary }, button_secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, button_danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "800", writingDirection: "rtl" }, buttonTextSecondary: { color: colors.primary }, disabled: { opacity: 0.5 }, pressed: { transform: [{ scale: 0.985 }] },
  field: { gap: 7 }, label: { color: colors.text, fontWeight: "800", fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FBFCFB", paddingHorizontal: 15, color: colors.text, fontSize: 15, writingDirection: "rtl" },
  multiline: { minHeight: 120, paddingTop: 14, textAlignVertical: "top" }, inputError: { borderColor: colors.danger }, errorText: { color: colors.danger, fontSize: 11, textAlign: "right" },
  empty: { minHeight: 210, alignItems: "center", justifyContent: "center", padding: 24 }, emptyIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center", marginBottom: 12 }, emptyTitle: { fontWeight: "900", color: colors.text, fontSize: 16, textAlign: "center" }, emptyText: { color: colors.muted, textAlign: "center", lineHeight: 22, marginTop: 5, writingDirection: "rtl" },
  errorBanner: { borderRadius: 15, backgroundColor: colors.dangerSoft, padding: 13, flexDirection: "row-reverse", gap: 8, alignItems: "center", borderWidth: 1, borderColor: "#F6CBCB" }, successBanner: { borderRadius: 15, backgroundColor: colors.successSoft, padding: 13, flexDirection: "row-reverse", gap: 8, alignItems: "center", borderWidth: 1, borderColor: "#CAE7D4" },
  errorBannerText: { flex: 1, color: colors.danger, textAlign: "right", writingDirection: "rtl", lineHeight: 21 },
  successBannerText: { flex: 1, color: colors.success, textAlign: "right", writingDirection: "rtl", lineHeight: 21 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted }, badge_neutral: { backgroundColor: colors.surfaceMuted }, badge_success: { backgroundColor: colors.successSoft }, badge_warning: { backgroundColor: colors.warningSoft }, badge_danger: { backgroundColor: colors.dangerSoft }, badge_blue: { backgroundColor: colors.blueSoft },
  badgeText: { fontSize: 11, color: colors.muted, fontWeight: "800" }, badgeText_neutral: { color: colors.muted }, badgeText_success: { color: colors.success }, badgeText_warning: { color: colors.warning }, badgeText_danger: { color: colors.danger }, badgeText_blue: { color: colors.blue },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: colors.background },
});
