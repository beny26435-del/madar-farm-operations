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
        { id: string; employee_id: string; report_date: string; start_time: string | null; end_time: string | null; location: string; work_summary: string; issues: string | null; actions_taken: string | null; notes: string | null; status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at: string | null; deleted_at: string | null; created_at: string; updated_at: string },
        { employee_id: string; report_date: string; start_time?: string | null; end_time?: string | null; location?: string; work_summary?: string; issues?: string | null; actions_taken?: string | null; notes?: string | null; status?: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at?: string | null; deleted_at?: string | null }
      >;
      daily_report_collaborators: Table<
        { daily_report_id: string; employee_id: string; created_at: string },
        { daily_report_id: string; employee_id: string; created_at?: string }
      >;
      daily_tasks: Table<
        { id: string; title: string; task_date: string; created_by: string; completed_by: string | null; completed_at: string | null; created_at: string },
        { title: string; task_date: string; created_by: string; completed_by?: string | null; completed_at?: string | null },
        { title?: string; completed_by?: string | null; completed_at?: string | null }
      >;
      daily_report_expenses: Table<
        { id: string; daily_report_id: string; description: string; amount: number; invoice_path: string | null; invoice_original_name: string | null; invoice_mime_type: string | null; invoice_size_bytes: number | null; created_at: string },
        { daily_report_id: string; description: string; amount: number; invoice_path?: string | null; invoice_original_name?: string | null; invoice_mime_type?: string | null; invoice_size_bytes?: number | null }
      >;
      customers: Table<
        { id: string; full_name: string; phone: string | null; created_by: string; created_at: string; updated_at: string },
        { full_name: string; phone?: string | null; created_by: string },
        { full_name?: string; phone?: string | null }
      >;
      customer_repair_items: Table<
        { id: string; customer_id: string; intake_id: string | null; item_name: string; quantity: number; details: string | null; status: "received" | "delivered"; received_at: string; delivered_at: string | null; created_by: string; created_at: string; updated_at: string },
        { customer_id: string; intake_id?: string | null; item_name: string; quantity?: number; details?: string | null; status?: "received" | "delivered"; received_at?: string; delivered_at?: string | null; created_by: string },
        { intake_id?: string | null; item_name?: string; quantity?: number; details?: string | null; status?: "received" | "delivered"; delivered_at?: string | null }
      >;
      customer_repair_intakes: Table<
        { id: string; customer_id: string; created_by: string; received_at: string; created_at: string },
        { customer_id: string; created_by: string; received_at?: string; created_at?: string }
      >;
      customer_handover_confirmations: Table<
        { id: string; item_id: string | null; intake_id: string | null; type: "intake" | "delivery"; token_hash: string; expires_at: string; confirmed_at: string | null; created_by: string; created_at: string },
        { item_id?: string | null; intake_id?: string | null; type: "intake" | "delivery"; token_hash: string; expires_at: string; confirmed_at?: string | null; created_by: string; created_at?: string },
        { token_hash?: string; expires_at?: string; confirmed_at?: string | null; created_at?: string }
      >;
      technician_jobs: Table<
        { id: string; repair_item_id: string; technician_name: string; item_name: string; customer_name: string; quantity: number; status: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; created_by: string; handed_over_at: string | null; returned_at: string | null; created_at: string; updated_at: string },
        { repair_item_id: string; technician_name: string; item_name: string; customer_name: string; quantity: number; status?: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; created_by: string; handed_over_at?: string | null; returned_at?: string | null },
        { technician_name?: string; quantity?: number; status?: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; handed_over_at?: string | null; returned_at?: string | null }
      >;
      technician_job_confirmations: Table<
        { id: string; job_id: string; type: "handover" | "return"; token_hash: string; expires_at: string; confirmed_at: string | null; created_by: string; created_at: string },
        { job_id: string; type: "handover" | "return"; token_hash: string; expires_at: string; confirmed_at?: string | null; created_by: string; created_at?: string },
        { token_hash?: string; expires_at?: string; confirmed_at?: string | null; created_at?: string }
      >;
      maintenance_reports: Table<
        { id: string; reporter_employee_id: string; report_date: string; location: string; title: string; description: string; work_status: "completed" | "pending" | "needs_follow_up"; technician_employee_id: string | null; technician_name: string | null; status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at: string | null; deleted_at: string | null; created_at: string; updated_at: string },
        { reporter_employee_id: string; report_date: string; location?: string; title?: string; description?: string; work_status?: "completed" | "pending" | "needs_follow_up"; technician_employee_id?: string | null; technician_name?: string | null; status?: "draft" | "submitted" | "approved" | "rejected" | "revision_requested"; submitted_at?: string | null; deleted_at?: string | null }
      >;
      report_reviews: Table<
        { id: string; report_type: "daily" | "maintenance"; report_id: string; reviewer_id: string; action: "approved" | "rejected" | "revision_requested"; comment: string | null; created_at: string },
        { report_type: "daily" | "maintenance"; report_id: string; reviewer_id: string; action: "approved" | "rejected" | "revision_requested"; comment?: string | null }
      >;
      activity_logs: Table<
        { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; created_at: string },
        { actor_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json; created_at?: string }
      >;
    };
    Views: Record<never, never>;
    Functions: {
      confirm_customer_handover: {
        Args: { p_token_hash: string };
        Returns: Array<{ result: string; confirmation_type: "intake" | "delivery" | null; repair_item_id: string | null; repair_intake_id: string | null; customer_name: string | null; repair_item_name: string | null; confirmation_time: string | null }>;
      };
      confirm_technician_handover: {
        Args: { p_token_hash: string };
        Returns: Array<{ result: string; confirmation_type: "handover" | "return" | null; technician_job_id: string | null; technician_name: string | null; repair_item_name: string | null; customer_name: string | null; quantity: number | null; confirmation_time: string | null }>;
      };
    };
    Enums: { app_role: AppRole; customer_confirmation_type: "intake" | "delivery"; technician_job_status: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; technician_confirmation_type: "handover" | "return" };
    CompositeTypes: Record<never, never>;
  };
};
