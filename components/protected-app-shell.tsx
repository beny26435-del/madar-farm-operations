import { requireViewer } from "@/lib/auth/viewer";
import { AppShell } from "./app-shell";

export async function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
