import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import type { Employee, Profile } from "@/lib/types";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  employee: Employee | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setProfile(null);
      setEmployee(null);
      return;
    }
    const [{ data: profileData }, { data: employeeData }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, role, avatar_path, is_active").eq("id", activeSession.user.id).maybeSingle(),
      supabase.from("employees").select("id, profile_id, full_name, email, status").eq("profile_id", activeSession.user.id).maybeSingle(),
    ]);
    if (!profileData?.is_active) {
      await supabase.auth.signOut();
      throw new Error("حساب کاربری فعال نیست.");
    }
    setProfile(profileData as Profile);
    setEmployee((employeeData as Employee | null) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      try { await loadIdentity(data.session); } finally { if (mounted) setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadIdentity(nextSession).finally(() => setLoading(false));
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); appState.remove(); };
  }, [loadIdentity]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    employee,
    loading,
    refreshProfile: async () => loadIdentity(session),
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) throw new Error("ایمیل یا رمز عبور صحیح نیست.");
      setSession(data.session);
      await loadIdentity(data.session);
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), [employee, loadIdentity, loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider پیدا نشد.");
  return value;
}
