"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { MapPin, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  InterviewType,
  InterviewOutcome,
} from "@/lib/constants";

interface Interview {
  id: number;
  type: string;
  scheduledAt: string;
  durationMinutes: number | null;
  location: string | null;
  interviewers: string | null;
  outcome: string;
  notes: string | null;
  applicationId: number;
  company: string;
  title: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  passed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function InterviewCard({
  interview,
  onOutcomeChange,
}: {
  interview: Interview;
  onOutcomeChange: (id: number, outcome: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  let interviewers: string[] = [];
  if (interview.interviewers) {
    try {
      const parsed = JSON.parse(interview.interviewers);
      if (Array.isArray(parsed)) {
        interviewers = parsed.filter(Boolean);
      }
    } catch {
      if (interview.interviewers.trim()) {
        interviewers = [interview.interviewers];
      }
    }
  }

  async function handleOutcomeChange(value: string) {
    setUpdating(true);
    try {
      await onOutcomeChange(interview.id, value);
    } finally {
      setUpdating(false);
    }
  }

  const scheduledDate = new Date(interview.scheduledAt);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/applications/${interview.applicationId}`}
            className="font-medium hover:underline"
          >
            {interview.company}
          </Link>
          <p className="text-sm text-muted-foreground truncate">{interview.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs capitalize">
            {INTERVIEW_TYPE_LABELS[interview.type as InterviewType] ?? interview.type}
          </Badge>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              OUTCOME_COLORS[interview.outcome] ?? "bg-slate-100 text-slate-700"
            }`}
          >
            {INTERVIEW_OUTCOME_LABELS[interview.outcome as InterviewOutcome] ?? interview.outcome}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{format(scheduledDate, "EEE, MMM d yyyy 'at' h:mm a")}</span>
        {interview.durationMinutes && (
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {interview.durationMinutes} min
          </span>
        )}
        {interview.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {interview.location}
          </span>
        )}
        {interviewers.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {interviewers.join(", ")}
          </span>
        )}
      </div>

      {interview.notes && (
        <p className="text-sm text-muted-foreground border-t pt-2">{interview.notes}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Outcome:</span>
        <Select
          value={interview.outcome}
          onValueChange={(value) => { if (value) handleOutcomeChange(value); }}
          disabled={updating}
        >
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INTERVIEW_OUTCOME_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  );
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInterviews() {
      try {
        const res = await fetch("/api/interviews");
        if (!res.ok) throw new Error("Failed to fetch interviews");
        const data = await res.json();
        setInterviews(data);
      } catch {
        toast.error("Failed to load interviews");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInterviews();
  }, []);

  async function handleOutcomeChange(id: number, outcome: string) {
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) throw new Error("Failed to update outcome");
      const updated = await res.json();
      setInterviews((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updated } : i))
      );
      toast.success("Outcome updated");
    } catch {
      toast.error("Failed to update outcome");
    }
  }

  const upcoming = interviews
    .filter((i) => !isPast(new Date(i.scheduledAt)))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const past = interviews
    .filter((i) => isPast(new Date(i.scheduledAt)))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const isEmpty = !isLoading && interviews.length === 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Interviews</h1>

      {isLoading ? (
        <div className="space-y-8">
          <div>
            <Skeleton className="h-5 w-24 mb-4" />
            <SectionSkeleton />
          </div>
          <div>
            <Skeleton className="h-5 w-16 mb-4" />
            <SectionSkeleton />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20">
          <p className="text-sm text-muted-foreground">No interviews recorded yet</p>
          <p className="text-xs text-muted-foreground">
            Interviews are added from individual application pages
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Upcoming ({upcoming.length})
              </h2>
              {upcoming.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  onOutcomeChange={handleOutcomeChange}
                />
              ))}
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Past ({past.length})
              </h2>
              {past.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  onOutcomeChange={handleOutcomeChange}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
