export type AppRole = "admin" | "manager" | "employee";

export type Profile = {
  id: string;
  display_name: string;
  role: AppRole;
  avatar_path: string | null;
  is_active: boolean;
};

export type Employee = {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  status: "active" | "inactive";
};

export type DailyTask = {
  id: string;
  title: string;
  task_date: string;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DailyReport = {
  id: string;
  employee_id: string;
  report_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  work_summary: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "revision_requested";
  submitted_at: string | null;
  deleted_at?: string | null;
};

export type Customer = { id: string; full_name: string; phone: string | null; created_at: string };
export type RepairItem = { id: string; customer_id: string; intake_id: string | null; item_name: string; quantity: number; photo_path: string | null; status: "received" | "delivered"; received_at: string; delivered_at: string | null };
export type TechnicianJob = { id: string; repair_item_id: string; technician_name: string; item_name: string; customer_name: string; quantity: number; status: "awaiting_handover" | "with_technician" | "awaiting_return" | "returned"; created_by: string; created_at: string };
