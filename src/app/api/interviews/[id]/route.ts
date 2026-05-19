import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviews } from "@/db/schema";
import { interviewSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [existing] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = interviewSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.interviewers !== undefined) {
    updateData.interviewers = JSON.stringify(
      parsed.data.interviewers.split(",").map((s) => s.trim()).filter(Boolean)
    );
  }

  const [updated] = await db
    .update(interviews)
    .set(updateData)
    .where(eq(interviews.id, Number(id)))
    .returning();

  await logActivity({
    applicationId: existing.applicationId,
    activityType: "interview_updated",
    description: "Interview updated",
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [existing] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(interviews).where(eq(interviews.id, Number(id)));
  return NextResponse.json({ success: true });
}
