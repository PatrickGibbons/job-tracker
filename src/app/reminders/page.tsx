"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/applications/StatusBadge";

interface Application {
  id: number;
  company: string;
  title: string;
  status: string;
  followUpDate: string | null;
  archived: boolean;
}

const SKIP_STATUSES = ["accepted", "rejected", "withdrawn"];

export default function RemindersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearingId, setClearingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch("/api/applications?archived=false");
        if (!res.ok) throw new Error("Failed to fetch applications");
        const data = await res.json();
        setApplications(data);
      } catch {
        toast.error("Failed to load reminders");
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, []);

  const today = startOfDay(new Date());

  const reminders = applications
    .filter((app) => {
      if (!app.followUpDate) return false;
      if (SKIP_STATUSES.includes(app.status)) return false;
      const followUp = startOfDay(new Date(app.followUpDate));
      return isBefore(followUp, today) || isToday(new Date(app.followUpDate));
    })
    .sort((a, b) => {
      const dateA = new Date(a.followUpDate!).getTime();
      const dateB = new Date(b.followUpDate!).getTime();
      return dateA - dateB;
    });

  async function handleMarkFollowedUp(app: Application) {
    setClearingId(app.id);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: "" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, followUpDate: null } : a))
      );
      toast.success("Follow-up cleared");
    } catch {
      toast.error("Failed to clear follow-up");
    } finally {
      setClearingId(null);
    }
  }

  function getDateColor(followUpDate: string) {
    const d = new Date(followUpDate);
    if (isToday(d)) return "text-amber-600 font-medium";
    if (isBefore(startOfDay(d), today)) return "text-red-600 font-medium";
    return "text-muted-foreground";
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted-foreground mt-1">Applications needing follow-up</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20">
          <Bell className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            No applications need follow-up right now. Check back later or set follow-up dates on
            your applications.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {reminders.length} application{reminders.length !== 1 ? "s" : ""} need
            {reminders.length === 1 ? "s" : ""} follow-up
          </p>
          {reminders.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{app.company}</span>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{app.title}</p>
                <p className={`text-xs mt-1 ${getDateColor(app.followUpDate!)}`}>
                  Follow-up:{" "}
                  {isToday(new Date(app.followUpDate!))
                    ? "Today"
                    : isBefore(startOfDay(new Date(app.followUpDate!)), today)
                    ? `Overdue — ${format(new Date(app.followUpDate!), "MMM d, yyyy")}`
                    : format(new Date(app.followUpDate!), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkFollowedUp(app)}
                  disabled={clearingId === app.id}
                  className="gap-1.5"
                >
                  <CheckCheck className="size-3.5" />
                  {clearingId === app.id ? "Clearing..." : "Mark Followed Up"}
                </Button>
                <Link href={`/applications/${app.id}`} className={buttonVariants({ variant: "ghost", size: "sm" }) + " gap-1.5"}>
                  <ExternalLink className="size-3.5" />
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
