"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import Link from "next/link";
import {
  ApplicationStatus,
  PIPELINE_STATUSES,
  TERMINAL_STATUSES,
  STATUS_CONFIG,
  REMOTE_TYPE_LABELS,
  RemoteType,
} from "@/lib/constants";
import { StatusBadge } from "@/components/applications/StatusBadge";
import { MapPin, Calendar } from "lucide-react";

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

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: number, newStatus: ApplicationStatus) => void;
}

function KanbanCard({
  application,
  index,
}: {
  application: Application;
  index: number;
}) {
  return (
    <Draggable draggableId={String(application.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-lg border bg-card p-3 shadow-sm ring-1 ring-foreground/10 transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
          }`}
        >
          <Link
            href={`/applications/${application.id}`}
            className="block"
            onClick={(e) => {
              // prevent navigation while dragging
              if (snapshot.isDragging) e.preventDefault();
            }}
          >
            <p className="text-sm font-medium leading-snug">{application.company}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {application.title}
            </p>
            <div className="mt-2">
              <StatusBadge status={application.status} />
            </div>
            {(application.location || application.dateApplied) && (
              <div className="mt-2 space-y-1">
                {application.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{application.location}</span>
                  </div>
                )}
                {application.dateApplied && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    <span>
                      {new Date(application.dateApplied).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            {application.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {application.tags.map((tag) => (
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
            )}
          </Link>
        </div>
      )}
    </Draggable>
  );
}

export function KanbanBoard({ applications, onStatusChange }: KanbanBoardProps) {
  const pipelineApps = PIPELINE_STATUSES.reduce<Record<string, Application[]>>(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status);
      return acc;
    },
    {}
  );

  const terminalApps = TERMINAL_STATUSES.reduce<Record<string, Application[]>>(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status);
      return acc;
    },
    {}
  );

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId as ApplicationStatus;
    const destStatus = result.destination.droppableId as ApplicationStatus;

    if (sourceStatus === destStatus) return;

    // Only allow drops into pipeline statuses
    if (!PIPELINE_STATUSES.includes(destStatus)) return;

    const appId = Number(result.draggableId);
    onStatusChange(appId, destStatus);
  }

  return (
    <div className="space-y-8">
      {/* Pipeline columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const cols = pipelineApps[status] ?? [];
            return (
              <div
                key={status}
                className="flex min-w-[240px] flex-1 flex-col rounded-xl border bg-muted/30"
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <span className="text-sm font-medium">{cfg.label}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bgColor} ${cfg.textColor}`}
                  >
                    {cols.length}
                  </span>
                </div>

                {/* Cards */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-1 flex-col gap-2 p-2 transition-colors min-h-[120px] ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                    >
                      {cols.map((app, index) => (
                        <KanbanCard key={app.id} application={app} index={index} />
                      ))}
                      {provided.placeholder}
                      {cols.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8">
                          <p className="text-xs text-muted-foreground">No applications</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Terminal statuses row */}
      {TERMINAL_STATUSES.some((s) => (terminalApps[s]?.length ?? 0) > 0) && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Terminal
          </h3>
          <div className="flex flex-wrap gap-3">
            {TERMINAL_STATUSES.map((status) => {
              const apps = terminalApps[status] ?? [];
              if (apps.length === 0) return null;
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {cfg.label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.bgColor} ${cfg.textColor}`}
                    >
                      {apps.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {apps.map((app) => (
                      <Link
                        key={app.id}
                        href={`/applications/${app.id}`}
                        className="rounded-lg border bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
                      >
                        <p className="text-xs font-medium">{app.company}</p>
                        <p className="text-xs text-muted-foreground">{app.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
