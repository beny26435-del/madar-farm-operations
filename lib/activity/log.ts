import "server-only";

import type { Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordActivity(input: { actorId: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Json }) {
  const admin = createAdminClient();
  await admin.from("activity_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
