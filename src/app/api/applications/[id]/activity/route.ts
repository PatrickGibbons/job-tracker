import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.applicationId, Number(id)))
    .orderBy(desc(activityLog.createdAt));
  return NextResponse.json(rows);
}
