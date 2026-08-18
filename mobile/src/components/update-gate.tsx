import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";

export function UpdateGate() {
  const checking = useRef(false);

  useEffect(() => {
    async function check() {
      if (!Updates.isEnabled || checking.current) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        Alert.alert("به‌روزرسانی آماده است", "نسخه جدید MinePlus دریافت شد.", [
          { text: "بعداً", style: "cancel" },
          { text: "اجرای نسخه جدید", onPress: () => void Updates.reloadAsync() },
        ]);
      } catch {
        // A failed update check must never block the app.
      } finally { checking.current = false; }
    }
    void check();
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") void check(); });
    return () => listener.remove();
  }, []);

  return null;
}
