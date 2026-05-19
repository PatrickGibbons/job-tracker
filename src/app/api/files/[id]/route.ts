import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { deleteFile, getFilePath } from "@/lib/file-storage";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";
import fs from "fs/promises";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [file] = await db.select().from(files).where(eq(files.id, Number(id)));
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = getFilePath(file.applicationId, file.storedName);
  const buffer = await fs.readFile(filePath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "File not found on disk" }, { status: 404 });

  const inline = req.nextUrl.searchParams.get("view") === "1";
  const disposition = inline
    ? `inline; filename="${file.originalName}"`
    : `attachment; filename="${file.originalName}"`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": disposition,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [file] = await db.select().from(files).where(eq(files.id, Number(id)));
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFile(file.applicationId, file.storedName);
  await db.delete(files).where(eq(files.id, Number(id)));

  await logActivity({
    applicationId: file.applicationId,
    activityType: "file_deleted",
    description: `File deleted: ${file.originalName}`,
  });

  return NextResponse.json({ success: true });
}
