import { NextResponse } from "next/server";
import { db } from "@/db";
import { interviews, applications } from "@/db/schema";
import { eq, gte, asc } from "drizzle-orm";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select({
      id: interviews.id,
      type: interviews.type,
      scheduledAt: interviews.scheduledAt,
      durationMinutes: interviews.durationMinutes,
      location: interviews.location,
      interviewers: interviews.interviewers,
      outcome: interviews.outcome,
      notes: interviews.notes,
      applicationId: interviews.applicationId,
      company: applications.company,
      title: applications.title,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .orderBy(asc(interviews.scheduledAt));

  return NextResponse.json(rows);
}
