import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/colors";

const icon = (name: keyof typeof Ionicons.glyphMap, focused: boolean, primary = false) => primary ? <View style={styles.primaryIcon}><Ionicons name={name} size={23} color="#fff" /></View> : <Ionicons name={name} size={22} color={focused ? colors.primary : "#849087"} />;

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#849087", tabBarLabelStyle: styles.label, tabBarStyle: styles.bar, tabBarItemStyle: styles.item }}>
    <Tabs.Screen name="index" options={{ title: "خانه", tabBarIcon: ({ focused }) => icon("home-outline", focused) }} />
    <Tabs.Screen name="maintenance" options={{ title: "تعمیرات", tabBarIcon: ({ focused }) => icon("construct-outline", focused) }} />
    <Tabs.Screen name="report" options={{ title: "گزارش", tabBarIcon: ({ focused }) => icon("add", focused, true), tabBarItemStyle: [styles.item, styles.primaryItem] }} />
    <Tabs.Screen name="history" options={{ title: "سوابق", tabBarIcon: ({ focused }) => icon("documents-outline", focused) }} />
    <Tabs.Screen name="more" options={{ title: "بیشتر", tabBarIcon: ({ focused }) => icon("grid-outline", focused) }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  bar: { position: "absolute", height: 76, paddingTop: 7, paddingBottom: 9, marginHorizontal: 10, marginBottom: 9, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.98)", borderTopWidth: 0, elevation: 14, shadowColor: "#17231D", shadowOpacity: 0.13, shadowRadius: 20 },
  item: { paddingVertical: 3 }, label: { fontSize: 10, fontWeight: "700" }, primaryItem: { marginTop: -13 }, primaryIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.background, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
});
