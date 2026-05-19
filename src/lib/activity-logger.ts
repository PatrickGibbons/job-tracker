import { db } from "@/db";
import { activityLog } from "@/db/schema";

type ActivityType = typeof activityLog.$inferInsert["activityType"];

export async function logActivity(params: {
  applicationId: number;
  activityType: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(activityLog).values({
    applicationId: params.applicationId,
    activityType: params.activityType,
    description: params.description,
    metadata: JSON.stringify(params.metadata ?? {}),
  });
}
