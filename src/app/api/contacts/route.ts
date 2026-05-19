import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, applicationContacts, applications } from "@/db/schema";
import { contactSchema } from "@/lib/validations";
import { eq, like, or, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search");
  const conditions = search
    ? [or(like(contacts.name, `%${search}%`), like(contacts.company, `%${search}%`))]
    : [];

  const rows = await db
    .select()
    .from(contacts)
    .where(conditions.length ? conditions[0] : undefined)
    .orderBy(desc(contacts.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .returning();

  return NextResponse.json(contact, { status: 201 });
}
