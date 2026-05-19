import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, applicationTags, tags } from "@/db/schema";
import { applicationSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { desc, eq, and, or, like, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const archived = searchParams.get("archived") === "true";
  const tagIds = searchParams.get("tags")?.split(",").map(Number).filter(Boolean);

  const conditions = [eq(applications.archived, archived)];
  if (status && status !== "all") {
    conditions.push(eq(applications.status, status as never));
  }
  if (search) {
    conditions.push(
      or(
        like(applications.company, `%${search}%`),
        like(applications.title, `%${search}%`),
        like(applications.location, `%${search}%`)
      )!
    );
  }

  let rows = await db
    .select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(desc(applications.updatedAt));

  if (tagIds && tagIds.length > 0) {
    const tagged = await db
      .select({ applicationId: applicationTags.applicationId })
      .from(applicationTags)
      .where(inArray(applicationTags.tagId, tagIds));
    const ids = tagged.map((t) => t.applicationId);
    rows = rows.filter((r) => ids.includes(r.id));
  }

  // Attach tags to each application
  const appIds = rows.map((r) => r.id);
  const allTags =
    appIds.length > 0
      ? await db
          .select({
            applicationId: applicationTags.applicationId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(applicationTags)
          .innerJoin(tags, eq(applicationTags.tagId, tags.id))
          .where(inArray(applicationTags.applicationId, appIds))
      : [];

  const result = rows.map((app) => ({
    ...app,
    tags: allTags
      .filter((t) => t.applicationId === app.id)
      .map((t) => ({ id: t.tagId, name: t.tagName, color: t.tagColor })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [app] = await db
    .insert(applications)
    .values({
      ...parsed.data,
      url: parsed.data.url || null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
    })
    .returning();

  await logActivity({
    applicationId: app.id,
    activityType: "application_created",
    description: `Application created for ${app.title} at ${app.company}`,
  });

  return NextResponse.json(app, { status: 201 });
}
