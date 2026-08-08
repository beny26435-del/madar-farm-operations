import type { AppRole } from "@/lib/auth/roles";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; role: AppRole; avatar_path: string | null; is_active: boolean; created_at: string; updated_at: string },
        { id: string; display_name: string; role?: AppRole; avatar_path?: string | null; is_active?: boolean },
        { display_name?: string; role?: AppRole; avatar_path?: string | null; is_active?: boolean }
      >;
      employees: Table<
        { id: string; profile_id: string | null; full_name: string; email: string; status: "active" | "inactive"; created_at: string; updated_at: string },
        { profile_id?: string | null; full_name: string; email: string; status?: "active" | "inactive" }
      >;
      daily_reports: Table<
        { id: string; employee_id: string; report_date: string; start_time: string | null; end_time: string | null; work_summary: string; issues: string | null; actions_taken: string | null; notes: string | null; status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at: string | null; deleted_at: string | null; created_at: string; updated_at: string },
        { employee_id: string; report_date: string; start_time?: string | null; end_time?: string | null; work_summary?: string; issues?: string | null; actions_taken?: string | null; notes?: string | null; status?: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at?: string | null; deleted_at?: string | null }
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: { app_role: AppRole };
    CompositeTypes: Record<never, never>;
  };
};
