import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { I18nManager } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { LoadingScreen } from "@/components/ui";
import { UpdateGate } from "@/components/update-gate";
import { colors } from "@/constants/colors";

void SplashScreen.preventAutoHideAsync();
I18nManager.allowRTL(true);

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    void SplashScreen.hideAsync();
    const onLogin = segments[0] === "login";
    if (!session && !onLogin) router.replace("/login");
    if (session && onLogin) router.replace("/(tabs)");
  }, [loading, router, segments, session]);

  if (loading) return <LoadingScreen />;
  return <>
    <StatusBar style="light" />
    <UpdateGate />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "slide_from_left" }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="customer/[id]" />
      <Stack.Screen name="technicians" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="review" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="expenses" />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <AuthProvider><RootNavigator /></AuthProvider>;
}
