"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, LayoutList, LayoutGrid, Archive } from "lucide-react";
import {
  ApplicationStatus,
  ALL_STATUSES,
  STATUS_CONFIG,
  REMOTE_TYPE_LABELS,
  RemoteType,
} from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { KanbanBoard } from "@/components/applications/KanbanBoard";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Application {
  id: number;
  company: string;
  title: string;
  url: string | null;
  status: string;
  dateApplied: string | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: string | null;
  followUpDate: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

type ViewMode = "list" | "kanban";

function ApplicationsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const searchValue = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  // Debounce ref for search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return params.toString();
    },
    [searchParams]
  );

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchValue) {
        params.set("search", searchValue);
      }
      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchValue]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(pathname + "?" + createQueryString({ search: value, status: statusFilter }));
    }, 300);
  }

  function handleStatusFilter(status: string) {
    router.push(
      pathname + "?" + createQueryString({ status, search: searchValue })
    );
  }

  async function handleStatusChange(id: number, newStatus: ApplicationStatus) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );
      toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Failed to update application status");
    }
  }

  async function handleArchive(id: number) {
    setArchivingId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error("Failed to archive");
      setApplications((prev) => prev.filter((app) => app.id !== id));
      toast.success("Application archived");
    } catch {
      toast.error("Failed to archive application");
    } finally {
      setArchivingId(null);
    }
  }

  const isEmpty = !isLoading && applications.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New Application
        </Link>
      </div>

      {/* Filters & view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search company, title, location..."
            defaultValue={searchValue}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="size-4" />
            List
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="size-4" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilter("all")}
        >
          All
        </Button>
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter(s)}
          >
            {STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading applications...
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20">
          <p className="text-sm text-muted-foreground">No applications found</p>
          <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add your first application
          </Link>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Remote</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.company}</TableCell>
                  <TableCell className="text-muted-foreground">{app.title}</TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.dateApplied
                      ? new Date(app.dateApplied).toLocaleDateString("en-GB")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.remoteType
                      ? REMOTE_TYPE_LABELS[app.remoteType as RemoteType]
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: tag.color + "22",
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/applications/${app.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View</Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={archivingId === app.id}
                        onClick={() => handleArchive(app.id)}
                        title="Archive application"
                      >
                        <Archive className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading...
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  );
}
