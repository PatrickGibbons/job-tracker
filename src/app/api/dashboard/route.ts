import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, interviews } from "@/db/schema";
import { eq, gte, lte, and, desc, asc, notInArray } from "drizzle-orm";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const allApps = await db
    .select()
    .from(applications)
    .where(eq(applications.archived, false));

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const app of allApps) {
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;
  }

  // Weekly applications (last 8 weeks)
  const weeks: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekLabel = weekStart.toISOString().split("T")[0];
    const count = allApps.filter((a) => {
      const d = a.dateApplied ?? a.createdAt;
      return d >= weekStart.toISOString().split("T")[0] && d < weekEnd.toISOString().split("T")[0];
    }).length;
    weeks.push({ week: weekLabel, count });
  }

  const applied = allApps.filter((a) =>
    ["applied", "phone_screen", "interview", "offer", "accepted", "rejected"].includes(a.status)
  ).length;
  const responded = allApps.filter((a) =>
    ["phone_screen", "interview", "offer", "accepted", "rejected"].includes(a.status)
  ).length;
  const offers = allApps.filter((a) => ["offer", "accepted"].includes(a.status)).length;

  // Follow-up due (exclude terminal statuses to match reminders page behaviour)
  const followUpDue = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.archived, false),
        lte(applications.followUpDate, today),
        notInArray(applications.status, ["accepted", "rejected", "withdrawn"])
      )
    )
    .orderBy(asc(applications.followUpDate))
    .limit(10);

  // Upcoming interviews
  const upcomingInterviews = await db
    .select({
      id: interviews.id,
      type: interviews.type,
      scheduledAt: interviews.scheduledAt,
      applicationId: interviews.applicationId,
      company: applications.company,
      title: applications.title,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .where(and(gte(interviews.scheduledAt, today), eq(interviews.outcome, "pending")))
    .orderBy(asc(interviews.scheduledAt))
    .limit(5);

  return NextResponse.json({
    total: allApps.length,
    active: allApps.filter(
      (a) => !["accepted", "rejected", "withdrawn"].includes(a.status)
    ).length,
    responseRate: applied > 0 ? Math.round((responded / applied) * 100) : 0,
    offerRate: applied > 0 ? Math.round((offers / applied) * 100) : 0,
    statusCounts,
    weeklyApplications: weeks,
    followUpDue,
    upcomingInterviews,
  });
}
