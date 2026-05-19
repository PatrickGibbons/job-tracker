import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { googleDocs } from "@/db/schema";
import { renameGoogleDoc, deleteGoogleDoc } from "@/lib/google-drive";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [doc] = await db.select().from(googleDocs).where(eq(googleDocs.id, Number(id)));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await renameGoogleDoc(doc.googleFileId, name.trim());

  const [updated] = await db
    .update(googleDocs)
    .set({ name: name.trim() })
    .where(eq(googleDocs.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [doc] = await db.select().from(googleDocs).where(eq(googleDocs.id, Number(id)));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!doc.isLinked) {
    await deleteGoogleDoc(doc.googleFileId);
  }
  await db.delete(googleDocs).where(eq(googleDocs.id, Number(id)));

  await logActivity({
    applicationId: doc.applicationId,
    activityType: "doc_deleted",
    description: doc.isLinked
      ? `Google Doc unlinked: ${doc.name}`
      : `Google Doc deleted: ${doc.name}`,
  });

  return NextResponse.json({ success: true });
}
