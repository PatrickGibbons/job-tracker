"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Download,
  Eye,
  Upload,
  UserPlus,
  UserMinus,
  CheckCircle,
  FileText,
  Phone,
  Video,
  Building,
  Code,
  HelpCircle,
  MessageSquare,
  Tag,
  Link as LinkIcon,
  Calendar,
  Activity,
  ExternalLink,
  FileEdit,
} from "lucide-react";

import {
  PIPELINE_STATUSES,
  TERMINAL_STATUSES,
  STATUS_CONFIG,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  REMOTE_TYPE_LABELS,
  type ApplicationStatus,
  type InterviewType,
  type InterviewOutcome,
  type RemoteType,
} from "@/lib/constants";

import { StatusBadge } from "@/components/applications/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TagType {
  id: number;
  name: string;
  color: string;
}

interface Application {
  id: number;
  company: string;
  title: string;
  url: string | null;
  status: ApplicationStatus;
  dateApplied: string | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: RemoteType | null;
  followUpDate: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  tags: TagType[];
}

interface Note {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Interview {
  id: number;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number | null;
  location: string | null;
  interviewers: string; // JSON array string
  outcome: InterviewOutcome;
  notes: string | null;
}

interface FileRecord {
  id: number;
  originalName: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
}

interface LinkedContact {
  id: number;
  contactId: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  company: string | null;
  relationship: string | null;
}

interface ContactSearchResult {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
}

interface ActivityEntry {
  id: number;
  activityType: string;
  description: string;
  createdAt: string;
  metadata: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function getInterviewersArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Status Pipeline ─────────────────────────────────────────────────────────

function StatusPipeline({ status }: { status: ApplicationStatus }) {
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const currentIndex = PIPELINE_STATUSES.indexOf(status);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ol className="flex items-center gap-0">
        {PIPELINE_STATUSES.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const isActive = s === status;
          const isPast = !isTerminal && currentIndex > i;
          return (
            <li key={s} className="flex items-center">
              <div
                className={[
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? `${cfg.bgColor} ${cfg.textColor} ring-2 ring-offset-1`
                    : isPast
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isPast && <CheckCircle className="size-3" />}
                {cfg.label}
              </div>
              {i < PIPELINE_STATUSES.length - 1 && (
                <div
                  className={[
                    "h-px w-4",
                    isPast || isActive ? "bg-primary/40" : "bg-muted",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
      {isTerminal && <StatusBadge status={status} />}
    </div>
  );
}

// ─── Notes Tab ───────────────────────────────────────────────────────────────

function NotesTab({ applicationId }: { applicationId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/notes`)
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => toast.error("Failed to load notes"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  async function handleAddNote() {
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewContent("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNote(id: number) {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  }

  async function handleSaveEdit(id: number) {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
      toast.success("Note updated");
    } catch {
      toast.error("Failed to update note");
    }
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Add Note */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 font-medium text-sm">
          Add a note
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div data-color-mode="light">
            <MDEditor
              value={newContent}
              onChange={(v) => setNewContent(v ?? "")}
              preview="edit"
              height={160}
            />
          </div>
          <Button
            size="sm"
            disabled={isSubmitting || !newContent.trim()}
            onClick={handleAddNote}
          >
            <Plus className="size-4" />
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No notes yet. Add one above.
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4 pb-3 px-4 space-y-3">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <div data-color-mode="light">
                      <MDEditor
                        value={editContent}
                        onChange={(v) => setEditContent(v ?? "")}
                        preview="edit"
                        height={160}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(note.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans m-0 leading-relaxed">
                    {note.content}
                  </pre>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.createdAt), {
                      addSuffix: true,
                    })}
                    {note.updatedAt !== note.createdAt && " (edited)"}
                  </span>
                  {editingId !== note.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <DeleteNoteDialog onConfirm={() => handleDeleteNote(note.id)} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteNoteDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Trash2 className="size-3.5 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete note?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Interviews Tab ───────────────────────────────────────────────────────────

function InterviewTypeIcon({ type }: { type: InterviewType }) {
  switch (type) {
    case "phone":
      return <Phone className="size-4" />;
    case "video":
      return <Video className="size-4" />;
    case "onsite":
      return <Building className="size-4" />;
    case "technical":
      return <Code className="size-4" />;
    default:
      return <HelpCircle className="size-4" />;
  }
}

function InterviewsTab({ applicationId }: { applicationId: number }) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    type: "phone" as InterviewType,
    scheduledAt: "",
    durationMinutes: "",
    location: "",
    interviewers: "",
    notes: "",
  });

  function resetForm() {
    setForm({
      type: "phone",
      scheduledAt: "",
      durationMinutes: "",
      location: "",
      interviewers: "",
      notes: "",
    });
    setEditingId(null);
  }

  function openEditSheet(iv: Interview) {
    setForm({
      type: iv.type,
      scheduledAt: iv.scheduledAt.slice(0, 16),
      durationMinutes: iv.durationMinutes ? String(iv.durationMinutes) : "",
      location: iv.location ?? "",
      interviewers: getInterviewersArray(iv.interviewers).join(", "),
      notes: iv.notes ?? "",
    });
    setEditingId(iv.id);
    setSheetOpen(true);
  }

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/interviews`)
      .then((r) => r.json())
      .then(setInterviews)
      .catch(() => toast.error("Failed to load interviews"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const body = {
      type: form.type,
      scheduledAt: form.scheduledAt,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      location: form.location || undefined,
      interviewers: form.interviewers || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editingId !== null) {
        const res = await fetch(`/api/interviews/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setInterviews((prev) => prev.map((iv) => (iv.id === editingId ? updated : iv)));
        toast.success("Interview updated");
      } else {
        const res = await fetch(`/api/applications/${applicationId}/interviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setInterviews((prev) => [...prev, created]);
        toast.success("Interview scheduled");
      }
      resetForm();
      setSheetOpen(false);
    } catch {
      toast.error(editingId !== null ? "Failed to update interview" : "Failed to schedule interview");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOutcomeChange(id: number, outcome: InterviewOutcome) {
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) throw new Error("Failed to update outcome");
      const updated = await res.json();
      setInterviews((prev) => prev.map((iv) => (iv.id === id ? updated : iv)));
      toast.success("Outcome updated");
    } catch {
      toast.error("Failed to update outcome");
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete interview");
      setInterviews((prev) => prev.filter((iv) => iv.id !== id));
      toast.success("Interview deleted");
    } catch {
      toast.error("Failed to delete interview");
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm(); }}>
          <SheetTrigger render={<Button size="sm" />}>
            <Plus className="size-4" />
            Schedule Interview
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingId !== null ? "Edit Interview" : "Schedule Interview"}</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as InterviewType }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(INTERVIEW_TYPE_LABELS) as [
                        InterviewType,
                        string,
                      ][]
                    ).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="60"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durationMinutes: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  placeholder="Zoom / 123 Main St"
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Interviewers (comma-separated)</Label>
                <Input
                  placeholder="Alice, Bob"
                  value={form.interviewers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, interviewers: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Preparation notes..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting
                  ? editingId !== null ? "Saving..." : "Scheduling..."
                  : editingId !== null ? "Save Changes" : "Schedule Interview"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No interviews scheduled yet.
        </p>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => {
            const interviewers = getInterviewersArray(iv.interviewers);
            return (
              <Card key={iv.id}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <InterviewTypeIcon type={iv.type} />
                      {INTERVIEW_TYPE_LABELS[iv.type]}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={iv.outcome}
                        onValueChange={(v) =>
                          handleOutcomeChange(iv.id, v as InterviewOutcome)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(
                              INTERVIEW_OUTCOME_LABELS
                            ) as [InterviewOutcome, string][]
                          ).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSheet(iv)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <DeleteInterviewDialog onConfirm={() => handleDelete(iv.id)} />
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {format(new Date(iv.scheduledAt), "PPp")}
                      {iv.durationMinutes && (
                        <span className="ml-1">
                          ({iv.durationMinutes} min)
                        </span>
                      )}
                    </div>
                    {iv.location && (
                      <div className="flex items-center gap-1">
                        <Building className="size-3.5" />
                        {iv.location}
                      </div>
                    )}
                    {interviewers.length > 0 && (
                      <div>Interviewers: {interviewers.join(", ")}</div>
                    )}
                    {iv.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        {iv.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeleteInterviewDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Trash2 className="size-3.5 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete interview?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ applicationId }: { applicationId: number }) {
  const [fileList, setFileList] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/files`)
      .then((r) => r.json())
      .then(setFileList)
      .catch(() => toast.error("Failed to load files"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/applications/${applicationId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const record = await res.json();
      setFileList((prev) => [...prev, record]);
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFileList((prev) => prev.filter((f) => f.id !== id));
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-3">
            <Upload className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Upload file</p>
              <p className="text-xs text-muted-foreground">
                PDFs, Word docs, images, etc.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "Choose File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {fileList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No files uploaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {fileList.map((file) => {
            const isViewable = /^(image\/|application\/pdf)/.test(file.mimeType ?? "");
            const isImage = file.mimeType?.startsWith("image/") ?? false;
            const isPreviewing = previewId === file.id;
            return (
              <Card key={file.id}>
                <CardContent className="py-3 px-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} ·{" "}
                          {format(new Date(file.createdAt), "PP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isViewable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[0.8rem]"
                          onClick={() => setPreviewId(isPreviewing ? null : file.id)}
                        >
                          <Eye className="size-3.5" />
                          {isPreviewing ? "Hide" : "View"}
                        </Button>
                      )}
                      <a
                        href={`/api/files/${file.id}`}
                        download
                        className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Download className="size-3.5" />
                        Download
                      </a>
                      <DeleteFileDialog
                        fileName={file.originalName}
                        onConfirm={() => handleDelete(file.id)}
                      />
                    </div>
                  </div>
                  {isPreviewing && (
                    <div className="rounded-md overflow-hidden border border-border">
                      {isImage ? (
                        <img
                          src={`/api/files/${file.id}?view=1`}
                          alt={file.originalName}
                          className="max-w-full h-auto"
                        />
                      ) : (
                        <iframe
                          src={`/api/files/${file.id}?view=1`}
                          title={file.originalName}
                          className="w-full h-[600px]"
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeleteFileDialog({
  fileName,
  onConfirm,
}: {
  fileName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Trash2 className="size-3.5 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{fileName}&rdquo; will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function ContactsTab({ applicationId }: { applicationId: number }) {
  const [linked, setLinked] = useState<LinkedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    company: "",
    notes: "",
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/contacts`)
      .then((r) => r.json())
      .then(setLinked)
      .catch(() => toast.error("Failed to load contacts"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  const doSearch = useCallback(
    async (q: string) => {
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(q)}`
        );
        if (!res.ok) return;
        const data: ContactSearchResult[] = await res.json();
        const linkedIds = new Set(linked.map((c) => c.contactId));
        setSearchResults(data.filter((c) => !linkedIds.has(c.id)));
      } catch {
        // ignore
      }
    },
    [linked]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, doSearch]);

  async function handleLink(contactId: number) {
    try {
      const res = await fetch(`/api/applications/${applicationId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error("Failed to link contact");
      const refreshed: LinkedContact[] = await fetch(
        `/api/applications/${applicationId}/contacts`
      ).then((r) => r.json());
      setLinked(refreshed);
      setLinkPopoverOpen(false);
      toast.success("Contact linked");
    } catch {
      toast.error("Failed to link contact");
    }
  }

  async function handleUnlink(contactId: number) {
    try {
      const res = await fetch(`/api/applications/${applicationId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error("Failed to unlink contact");
      setLinked((prev) => prev.filter((c) => c.contactId !== contactId));
      toast.success("Contact unlinked");
    } catch {
      toast.error("Failed to unlink contact");
    }
  }

  async function handleCreateAndLink(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newContact,
          email: newContact.email || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      const contact = await res.json();
      await fetch(`/api/applications/${applicationId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      const refreshed: LinkedContact[] = await fetch(
        `/api/applications/${applicationId}/contacts`
      ).then((r) => r.json());
      setLinked(refreshed);
      setNewSheetOpen(false);
      setNewContact({ name: "", email: "", phone: "", role: "", company: "", notes: "" });
      toast.success("Contact created and linked");
    } catch {
      toast.error("Failed to create contact");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        {/* Link existing contact */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            <LinkIcon className="size-4" />
            Link Contact
          </PopoverTrigger>
          <PopoverContent className="p-0 w-72" align="end">
            <Command>
              <CommandInput
                placeholder="Search contacts..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No contacts found.</CommandEmpty>
                <CommandGroup>
                  {searchResults.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => handleLink(c.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {(c.company || c.email) && (
                          <p className="text-xs text-muted-foreground">
                            {c.company ?? c.email}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* New contact */}
        <Sheet open={newSheetOpen} onOpenChange={setNewSheetOpen}>
          <SheetTrigger render={<Button size="sm" />}>
            <UserPlus className="size-4" />
            New Contact
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Contact</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreateAndLink} className="mt-6 space-y-4 px-4">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  required
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input
                  value={newContact.role}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, role: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Input
                  value={newContact.company}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, company: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={newContact.notes}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Saving..." : "Create & Link"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No contacts linked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {linked.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3 px-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.role && (
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-xs text-blue-600 hover:underline block"
                    >
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Unlink contact"
                  onClick={() => handleUnlink(c.contactId)}
                >
                  <UserMinus className="size-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

interface GoogleDoc {
  id: number;
  name: string;
  googleFileId: string;
  googleFileUrl: string;
  isLinked: boolean;
  createdAt: string;
}

function DocumentsTab({ applicationId }: { applicationId: number }) {
  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [formMode, setFormMode] = useState<"new" | "link" | null>(null);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/gdocs`)
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => toast.error("Failed to load documents"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  function resetForm() {
    setFormMode(null);
    setNewDocName("");
    setNewDocUrl("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDocName.trim()) return;
    if (formMode === "link" && !newDocUrl.trim()) return;
    setIsCreating(true);
    try {
      const body: Record<string, string> = { name: newDocName.trim() };
      if (formMode === "link") body.url = newDocUrl.trim();

      const res = await fetch(`/api/applications/${applicationId}/gdocs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const doc = await res.json();
      setDocs((prev) => [...prev, doc]);
      resetForm();
      toast.success(formMode === "link" ? "Document linked" : "Document created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRename(id: number) {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch(`/api/gdocs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      const updated = await res.json();
      setDocs((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setRenamingId(null);
      toast.success("Document renamed");
    } catch {
      toast.error("Failed to rename document");
    }
  }

  async function handleDelete(id: number, isLinked: boolean) {
    try {
      const res = await fetch(`/api/gdocs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (previewDocId === id) setPreviewDocId(null);
      toast.success(isLinked ? "Document unlinked" : "Document deleted");
    } catch {
      toast.error(isLinked ? "Failed to unlink document" : "Failed to delete document");
    }
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end gap-2">
        {formMode === null ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setFormMode("link")}>
              <LinkIcon className="size-4" />
              Link Existing
            </Button>
            <Button size="sm" onClick={() => setFormMode("new")}>
              <Plus className="size-4" />
              New Document
            </Button>
          </>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder={formMode === "link" ? "Document name..." : "Document name..."}
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !newDocName.trim() || (formMode === "link" && !newDocUrl.trim())}
              >
                {isCreating ? "Saving..." : formMode === "link" ? "Link" : "Create"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
            {formMode === "link" && (
              <Input
                placeholder="https://docs.google.com/document/d/..."
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
              />
            )}
          </form>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No documents yet. Create one above.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const isPreviewing = previewDocId === doc.id;
            const embedUrl = `https://docs.google.com/document/d/${doc.googleFileId}/preview`;
            return (
              <Card key={doc.id}>
                <CardContent className="py-3 px-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileEdit className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        {renamingId === doc.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(doc.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              className="h-7 text-sm"
                            />
                            <Button size="sm" className="h-7 px-2" onClick={() => handleRename(doc.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setRenamingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.createdAt), "PP")}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {renamingId !== doc.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[0.8rem]"
                          onClick={() => setPreviewDocId(isPreviewing ? null : doc.id)}
                        >
                          <Eye className="size-3.5" />
                          {isPreviewing ? "Hide" : "View"}
                        </Button>
                        <a
                          href={doc.googleFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="size-3.5" />
                          Edit
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => { setRenamingId(doc.id); setRenameValue(doc.name); }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <DeleteDocDialog
                          name={doc.name}
                          isLinked={doc.isLinked}
                          onConfirm={() => handleDelete(doc.id, doc.isLinked)}
                        />
                      </div>
                    )}
                  </div>
                  {isPreviewing && (
                    <div className="rounded-md overflow-hidden border border-border">
                      <iframe
                        src={embedUrl}
                        title={doc.name}
                        className="w-full h-[600px]"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeleteDocDialog({ name, isLinked, onConfirm }: { name: string; isLinked: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 px-2" />}>
        {isLinked ? <LinkIcon className="size-3.5 text-destructive" /> : <Trash2 className="size-3.5 text-destructive" />}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isLinked ? "Unlink document?" : "Delete document?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isLinked
              ? `"${name}" will be removed from this application. The document will remain in Google Drive.`
              : `"${name}" will be permanently deleted from Google Drive. This cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLinked ? "Unlink" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "status_change":
      return <Activity className="size-4 text-blue-500" />;
    case "note_added":
    case "note_updated":
      return <MessageSquare className="size-4 text-violet-500" />;
    case "interview_scheduled":
    case "interview_updated":
      return <Calendar className="size-4 text-amber-500" />;
    case "file_uploaded":
    case "file_deleted":
      return <FileText className="size-4 text-gray-500" />;
    case "contact_linked":
    case "contact_unlinked":
      return <UserPlus className="size-4 text-green-500" />;
    case "tag_added":
    case "tag_removed":
      return <Tag className="size-4 text-pink-500" />;
    case "doc_linked":
    case "doc_deleted":
      return <FileEdit className="size-4 text-indigo-500" />;
    default:
      return <Activity className="size-4 text-muted-foreground" />;
  }
}

function ActivityTab({ applicationId }: { applicationId: number }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/activity`)
      .then((r) => r.json())
      .then(setActivity)
      .catch(() => toast.error("Failed to load activity"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-muted ml-2 space-y-6">
      {activity.map((entry) => (
        <li key={entry.id} className="ml-6">
          <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-background border border-muted">
            <ActivityIcon type={entry.activityType} />
          </span>
          <p className="text-sm">{entry.description}</p>
          <time className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </time>
        </li>
      ))}
    </ol>
  );
}

// ─── Details Tab ─────────────────────────────────────────────────────────────

function DetailsTab({
  app,
  onDelete,
}: {
  app: Application;
  onDelete: () => void;
}) {
  const fields: { label: string; value: React.ReactNode }[] = [
    {
      label: "Job URL",
      value: app.url ? (
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all flex items-center gap-1"
        >
          <LinkIcon className="size-3.5 shrink-0" />
          {app.url}
        </a>
      ) : (
        "—"
      ),
    },
    {
      label: "Date Applied",
      value: app.dateApplied ? format(new Date(app.dateApplied), "PP") : "—",
    },
    { label: "Source", value: app.source ?? "—" },
    {
      label: "Salary Range",
      value: formatSalary(app.salaryMin, app.salaryMax),
    },
    { label: "Location", value: app.location ?? "—" },
    {
      label: "Remote Type",
      value: app.remoteType ? REMOTE_TYPE_LABELS[app.remoteType] : "—",
    },
    {
      label: "Follow-up Date",
      value: app.followUpDate
        ? format(new Date(app.followUpDate), "PP")
        : "—",
    },
    {
      label: "Tags",
      value:
        app.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {app.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: tag.color + "22",
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      label: "Created",
      value: format(new Date(app.createdAt), "PPp"),
    },
    {
      label: "Last Updated",
      value: format(new Date(app.updatedAt), "PPp"),
    },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.label} className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {f.label}
            </dt>
            <dd className="text-sm">{f.value}</dd>
          </div>
        ))}
      </dl>

      <Separator />

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm" />
          }
        >
          <Trash2 className="size-4" />
          Delete Application
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application for{" "}
              <strong>{app.title}</strong> at <strong>{app.company}</strong>,
              along with all notes, interviews, files, and activity. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Application not found");
        return res.json();
      })
      .then(setApp)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleDelete() {
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Application deleted");
      router.push("/applications");
    } catch {
      toast.error("Failed to delete application");
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="text-destructive">{error ?? "Application not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground -ml-0.5"
      >
        <ArrowLeft className="size-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{app.company}</h1>
          <p className="text-muted-foreground">{app.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={app.status} />
          <Link
            href={`/applications/${id}/edit`}
            className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* Pipeline */}
      <StatusPipeline status={app.status} />

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="notes">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-6">
          <NotesTab applicationId={id} />
        </TabsContent>

        <TabsContent value="interviews" className="mt-6">
          <InterviewsTab applicationId={id} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesTab applicationId={id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab applicationId={id} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab applicationId={id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab applicationId={id} />
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <DetailsTab app={app} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
