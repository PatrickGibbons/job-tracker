import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { tagSchema } from "@/lib/validations";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(tags).orderBy(asc(tags.name));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [tag] = await db.insert(tags).values(parsed.data).returning();
  return NextResponse.json(tag, { status: 201 });
}
