import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorBanner, Field } from "@/components/ui";
import { colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!email.trim() || !password) return setError("ایمیل و رمز عبور را وارد کنید.");
    setPending(true);
    try { await signIn(email, password); } catch (reason) { setError(reason instanceof Error ? reason.message : "ورود انجام نشد."); } finally { setPending(false); }
  }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.brand}><View style={styles.logo}><Ionicons name="shapes-outline" size={42} color={colors.accent} /><View style={styles.dot} /></View><Text style={styles.brandTitle}>MinePlus</Text><Text style={styles.brandSubtitle}>سامانه یکپارچه عملیات</Text></View>
    <View style={styles.card}><View><Text style={styles.title}>ورود به برنامه</Text><Text style={styles.subtitle}>با حسابی که مدیر برای شما ساخته وارد شوید.</Text></View>{error ? <ErrorBanner message={error} /> : null}<Field label="ایمیل" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="off" /><Field label="رمز عبور" value={password} onChangeText={setPassword} secureTextEntry autoComplete="off" /><Button title="ورود امن" icon="log-in-outline" onPress={submit} loading={pending} /></View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary }, keyboard: { flex: 1, justifyContent: "center", padding: 22, gap: 30 },
  brand: { alignItems: "center" }, logo: { width: 78, height: 78, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", position: "relative" }, dot: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }, brandTitle: { marginTop: 13, color: "#fff", fontSize: 30, fontWeight: "900" }, brandSubtitle: { color: "#AAB8AF", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 26, padding: 21, gap: 17 }, title: { textAlign: "right", fontSize: 23, fontWeight: "900", color: colors.text, writingDirection: "rtl" }, subtitle: { textAlign: "right", color: colors.muted, marginTop: 5, lineHeight: 21, writingDirection: "rtl" },
});
