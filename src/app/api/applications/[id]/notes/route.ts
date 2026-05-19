import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, applications } from "@/db/schema";
import { noteSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.applicationId, Number(id)))
    .orderBy(desc(notes.createdAt));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [note] = await db
    .insert(notes)
    .values({ applicationId: appId, content: parsed.data.content })
    .returning();

  // Update notesSummary on the application (first 200 chars of the note)
  await db
    .update(applications)
    .set({
      notesSummary: parsed.data.content.slice(0, 200),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, appId));

  await logActivity({
    applicationId: appId,
    activityType: "note_added",
    description: "Note added",
  });

  return NextResponse.json(note, { status: 201 });
}
