import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviews } from "@/db/schema";
import { interviewSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(interviews)
    .where(eq(interviews.applicationId, Number(id)))
    .orderBy(asc(interviews.scheduledAt));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const body = await req.json();
  const parsed = interviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [interview] = await db
    .insert(interviews)
    .values({
      applicationId: appId,
      type: parsed.data.type,
      scheduledAt: parsed.data.scheduledAt,
      durationMinutes: parsed.data.durationMinutes ?? null,
      location: parsed.data.location ?? null,
      interviewers: parsed.data.interviewers
        ? JSON.stringify(
            parsed.data.interviewers.split(",").map((s) => s.trim()).filter(Boolean)
          )
        : "[]",
      outcome: parsed.data.outcome ?? "pending",
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await logActivity({
    applicationId: appId,
    activityType: "interview_scheduled",
    description: `${parsed.data.type} interview scheduled for ${parsed.data.scheduledAt}`,
  });

  return NextResponse.json(interview, { status: 201 });
}
