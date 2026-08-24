import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ExpoConfig, ConfigContext } from "expo/config";

loadEnv({ path: path.join(__dirname, "../.env.local") });

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PROJECT_ID ?? "46a67720-73c9-429e-b18c-6ca59182678c";
  const owner = process.env.EXPO_OWNER ?? "mineplus-benyaminstyles";
  return {
    ...config,
    name: "MinePlus",
    slug: "mineplus",
    owner,
    version: "2.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mineplus",
    userInterfaceStyle: "light",
    runtimeVersion: "2.1.0",
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 3000,
      url: `https://u.expo.dev/${projectId}`,
    },
    ios: {
      bundleIdentifier: "app.mineplus",
      supportsTablet: true,
      infoPlist: { CFBundleAllowMixedLocalizations: true },
    },
    android: {
      package: "app.mineplus",
      versionCode: 4,
      adaptiveIcon: {
        backgroundColor: "#17231D",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      permissions: ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"],
    },
    plugins: [
      "expo-router",
      "expo-font",
      ["expo-secure-store", { configureAndroidBackup: true }],
      ["expo-sqlite", { enableFTS: true }],
      ["expo-image-picker", { photosPermission: "برای انتخاب تصویر دستگاه، فاکتور یا پروفایل اجازه دسترسی لازم است.", cameraPermission: "برای گرفتن تصویر دستگاه یا فاکتور اجازه دوربین لازم است." }],
      ["expo-splash-screen", { backgroundColor: "#17231D", image: "./assets/images/splash-icon.png", imageWidth: 112 }],
      "expo-sharing",
    ],
    experiments: { typedRoutes: true, reactCompiler: true },
    extra: {
      apiUrl: "https://list-mine.vercel.app",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      eas: { projectId },
    },
  };
};
