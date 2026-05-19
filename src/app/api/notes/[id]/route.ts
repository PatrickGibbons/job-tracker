import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { noteSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db.select().from(notes).where(eq(notes.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(notes)
    .set({ content: parsed.data.content, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, Number(id)))
    .returning();

  await logActivity({
    applicationId: existing.applicationId,
    activityType: "note_updated",
    description: "Note updated",
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [existing] = await db.select().from(notes).where(eq(notes.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(notes).where(eq(notes.id, Number(id)));
  return NextResponse.json({ success: true });
}
