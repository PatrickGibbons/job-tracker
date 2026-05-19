import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { saveFile } from "@/lib/file-storage";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.applicationId, Number(id)));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const { storedName, size } = await saveFile(appId, file);

  const [record] = await db
    .insert(files)
    .values({
      applicationId: appId,
      originalName: file.name,
      storedName,
      mimeType: file.type || null,
      size,
    })
    .returning();

  await logActivity({
    applicationId: appId,
    activityType: "file_uploaded",
    description: `File uploaded: ${file.name}`,
  });

  return NextResponse.json(record, { status: 201 });
}
