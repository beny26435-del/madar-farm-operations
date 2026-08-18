import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ExpoConfig, ConfigContext } from "expo/config";

loadEnv({ path: path.join(__dirname, "../.env.local") });

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PROJECT_ID;
  return {
    ...config,
    name: "MinePlus",
    slug: "mineplus",
    owner: process.env.EXPO_OWNER,
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mineplus",
    userInterfaceStyle: "light",
    runtimeVersion: { policy: "appVersion" },
    updates: {
      enabled: Boolean(projectId),
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 3000,
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
    },
    ios: {
      bundleIdentifier: "app.mineplus",
      supportsTablet: true,
      infoPlist: { CFBundleAllowMixedLocalizations: true },
    },
    android: {
      package: "app.mineplus",
      versionCode: 3,
      adaptiveIcon: {
        backgroundColor: "#17231D",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      permissions: ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"],
    },
    plugins: [
      "expo-router",
      ["expo-secure-store", { configureAndroidBackup: true }],
      ["expo-sqlite", { enableFTS: true }],
      ["expo-image-picker", { photosPermission: "برای انتخاب تصویر فاکتور یا پروفایل اجازه دسترسی لازم است.", cameraPermission: "برای گرفتن تصویر فاکتور اجازه دوربین لازم است." }],
      ["expo-splash-screen", { backgroundColor: "#17231D", image: "./assets/images/splash-icon.png", imageWidth: 112 }],
      "expo-sharing",
    ],
    experiments: { typedRoutes: true, reactCompiler: true },
    extra: {
      apiUrl: "https://list-mine.vercel.app",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      eas: projectId ? { projectId } : undefined,
    },
  };
};
