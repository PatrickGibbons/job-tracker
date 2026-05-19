import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>)["@type"] === "JobPosting"
        ) {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

function normalizeRemoteType(text: string): "remote" | "hybrid" | "onsite" | "unknown" {
  const lower = text.toLowerCase();
  if (lower.includes("remote") && lower.includes("hybrid")) return "hybrid";
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  if (lower.includes("on-site") || lower.includes("onsite") || lower.includes("in office") || lower.includes("in-office")) return "onsite";
  return "unknown";
}

function parseSalaryFromJsonLd(value: unknown): { min: number | null; max: number | null } {
  if (!value) return { min: null, max: null };
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  const nums = text.match(/\d[\d,]*(?:\.\d+)?/g)?.map((n) => parseFloat(n.replace(/,/g, ""))) ?? [];
  const valid = nums.filter((n) => n > 0);
  if (valid.length === 0) return { min: null, max: null };
  if (valid.length === 1) return { min: valid[0], max: null };
  return { min: Math.min(...valid), max: Math.max(...valid) };
}

function fromJsonLd(data: Record<string, unknown>) {
  const hiringOrg = data.hiringOrganization as Record<string, unknown> | undefined;
  const jobLocation = data.jobLocation as Record<string, unknown> | undefined;
  const addr = (jobLocation?.address ?? jobLocation) as Record<string, unknown> | undefined;
  const salary = parseSalaryFromJsonLd(data.baseSalary);

  const locationParts = [addr?.addressLocality, addr?.addressRegion, addr?.addressCountry]
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  return {
    title: typeof data.title === "string" ? data.title : null,
    company: typeof hiringOrg?.name === "string" ? hiringOrg.name : null,
    location: locationParts.join(", ") || null,
    remoteType: normalizeRemoteType(
      [data.jobLocationType, data.workHours, data.employmentType].join(" ")
    ),
    salaryMin: salary.min,
    salaryMax: salary.max,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url: string = body.url ?? "";
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "Could not fetch URL" }, { status: 422 });
  }

  // Fast path: JSON-LD structured data
  const jsonLd = extractJsonLd(html);
  if (jsonLd) {
    return NextResponse.json(fromJsonLd(jsonLd));
  }

  // Fallback: ask Claude to extract from stripped page text
  const pageText = stripHtml(html).slice(0, 20000);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Extract job posting details from this web page text. Return ONLY a JSON object (no markdown, no explanation) with these fields — use null for anything not found:
{
  "title": string | null,
  "company": string | null,
  "location": string | null,
  "remoteType": "remote" | "hybrid" | "onsite" | "unknown",
  "salaryMin": number | null,
  "salaryMax": number | null
}

Page text:
${pageText}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }

  try {
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
