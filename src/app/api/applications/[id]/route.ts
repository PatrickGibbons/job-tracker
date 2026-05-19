import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, applicationTags, tags } from "@/db/schema";
import { applicationSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, appId));

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appTags = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(applicationTags)
    .innerJoin(tags, eq(applicationTags.tagId, tags.id))
    .where(eq(applicationTags.applicationId, appId));

  return NextResponse.json({ ...app, tags: appTags });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const body = await req.json();

  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, appId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = applicationSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(applications)
    .set({
      ...parsed.data,
      url: parsed.data.url === "" ? null : parsed.data.url,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, appId))
    .returning();

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await logActivity({
      applicationId: appId,
      activityType: "status_change",
      description: `Status changed from ${existing.status} to ${parsed.data.status}`,
      metadata: { from: existing.status, to: parsed.data.status },
    });
  } else {
    await logActivity({
      applicationId: appId,
      activityType: "application_updated",
      description: "Application details updated",
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  await db.delete(applications).where(eq(applications.id, appId));
  return NextResponse.json({ success: true });
}
