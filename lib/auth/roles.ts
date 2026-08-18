export const appRoles = ["admin", "manager", "employee"] as const;

export type AppRole = (typeof appRoles)[number];

export type Permission =
  | "dashboard:view"
  | "daily-report:write"
  | "maintenance-report:write"
  | "reports:review"
  | "employees:view"
  | "employees:manage"
  | "customers:view"
  | "customers:manage"
  | "technician-jobs:manage"
  | "activity:view"
  | "settings:manage";

export const roleLabels: Record<AppRole, string> = {
  admin: "مدیر اصلی",
  manager: "مدیر عملیات",
  employee: "کارمند",
};

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    "dashboard:view", "daily-report:write", "maintenance-report:write",
    "reports:review", "employees:view", "employees:manage", "customers:view", "customers:manage", "technician-jobs:manage", "activity:view", "settings:manage",
  ]),
  manager: new Set<Permission>([
    "dashboard:view", "daily-report:write", "maintenance-report:write",
    "employees:view", "employees:manage", "customers:view", "customers:manage", "technician-jobs:manage", "activity:view",
  ]),
  employee: new Set<Permission>([
    "dashboard:view", "daily-report:write", "maintenance-report:write", "technician-jobs:manage",
  ]),
};

export function hasPermission(role: AppRole, permission: Permission) {
  return permissions[role].has(permission);
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoles.includes(value as AppRole);
}
