import type { AppRole } from "./roles";

export type Viewer = {
  id: string;
  displayName: string;
  role: AppRole;
  avatarPath: string | null;
};
