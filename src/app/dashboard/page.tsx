"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CONFIG, INTERVIEW_TYPE_LABELS, ApplicationStatus } from "@/lib/constants";

interface DashboardData {
  total: number;
  active: number;
  responseRate: number;
  offerRate: number;
  statusCounts: Record<string, number>;
  weeklyApplications: { week: string; count: number }[];
  followUpDue: {
    id: number;
    company: string;
    title: string;
    followUpDate: string;
  }[];
  upcomingInterviews: {
    id: number;
    type: string;
    scheduledAt: string;
    applicationId: number;
    company: string;
    title: string;
  }[];
}

function StatCard({ label, value, isLoading }: { label: string; value: string | number; isLoading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-20 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const json = await res.json();
        setData(json);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const pieData = data
    ? Object.entries(data.statusCounts)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: STATUS_CONFIG[status as ApplicationStatus]?.label ?? status,
          value: count,
          color: STATUS_CONFIG[status as ApplicationStatus]?.color ?? "#94a3b8",
          status,
        }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Applications" value={data?.total ?? 0} isLoading={isLoading} />
        <StatCard label="Active Pipeline" value={data?.active ?? 0} isLoading={isLoading} />
        <StatCard
          label="Response Rate"
          value={isLoading ? 0 : `${(data?.responseRate ?? 0).toFixed(1)}%`}
          isLoading={isLoading}
        />
        <StatCard
          label="Offer Rate"
          value={isLoading ? 0 : `${(data?.offerRate ?? 0).toFixed(1)}%`}
          isLoading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart - status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [Number(value), ''] as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
                  {pieData.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block size-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bar chart - weekly applications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-end gap-3 h-48 px-4">
                {[40, 70, 50, 90, 60, 80].map((h, i) => (
                  <Skeleton key={i} className="flex-1 rounded" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : !data?.weeklyApplications?.length ? (
              <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.weeklyApplications} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => {
                      const d = new Date(val);
                      return isNaN(d.getTime()) ? val : format(d, "MMM d");
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label: unknown) => {
                      const s = String(label);
                      const d = new Date(s);
                      return isNaN(d.getTime()) ? s : `Week of ${format(d, "MMM d, yyyy")}`;
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Applications" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Due & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow-up Due */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-up Due</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : !data?.followUpDue?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No follow-ups due</p>
            ) : (
              <ul className="divide-y">
                {data.followUpDue.map((app) => (
                  <li key={app.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-start justify-between gap-2 hover:opacity-75 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{app.company}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {app.followUpDate
                          ? format(new Date(app.followUpDate), "MMM d, yyyy")
                          : "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </div>
            ) : !data?.upcomingInterviews?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming interviews</p>
            ) : (
              <ul className="divide-y">
                {data.upcomingInterviews.map((interview) => (
                  <li key={interview.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/applications/${interview.applicationId}`}
                      className="flex items-start justify-between gap-2 hover:opacity-75 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{interview.company}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {interview.title} &middot;{" "}
                          {INTERVIEW_TYPE_LABELS[interview.type as keyof typeof INTERVIEW_TYPE_LABELS] ?? interview.type}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {interview.scheduledAt
                          ? format(new Date(interview.scheduledAt), "MMM d, h:mm a")
                          : "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
