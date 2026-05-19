import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applicationTags, tags } from "@/db/schema";
import { logActivity } from "@/lib/activity-logger";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const { tagId } = await req.json();

  const [tag] = await db.select().from(tags).where(eq(tags.id, Number(tagId)));
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  await db
    .insert(applicationTags)
    .values({ applicationId: appId, tagId: Number(tagId) })
    .onConflictDoNothing();

  await logActivity({
    applicationId: appId,
    activityType: "tag_added",
    description: `Tag added: ${tag.name}`,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const { tagId } = await req.json();

  const [tag] = await db.select().from(tags).where(eq(tags.id, Number(tagId)));

  await db
    .delete(applicationTags)
    .where(
      and(
        eq(applicationTags.applicationId, appId),
        eq(applicationTags.tagId, Number(tagId))
      )
    );

  await logActivity({
    applicationId: appId,
    activityType: "tag_removed",
    description: `Tag removed: ${tag?.name ?? "Unknown"}`,
  });

  return NextResponse.json({ success: true });
}
