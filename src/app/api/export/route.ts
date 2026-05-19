import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exportApplicationsToCSV } from "@/lib/csv-export";

export async function GET() {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.archived, false));

  const csv = exportApplicationsToCSV(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
