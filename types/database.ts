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
        { id: string; profile_id: string | null; personnel_code: string; full_name: string; mobile: string | null; status: "active" | "inactive"; created_at: string; updated_at: string },
        { profile_id?: string | null; personnel_code: string; full_name: string; mobile?: string | null; status?: "active" | "inactive" }
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: { app_role: AppRole };
    CompositeTypes: Record<never, never>;
  };
};
