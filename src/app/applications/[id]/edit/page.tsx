"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { ApplicationFormValues } from "@/lib/validations";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { Skeleton } from "@/components/ui/skeleton";

interface ApplicationData {
  id: number;
  company: string;
  title: string;
  url: string | null;
  status: ApplicationFormValues["status"];
  dateApplied: string | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: ApplicationFormValues["remoteType"];
  followUpDate: string | null;
}

export default function EditApplicationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [app, setApp] = useState<ApplicationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  async function handleSubmit(data: ApplicationFormValues) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const fieldErrors = body?.error?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        const formErrors = body?.error?.formErrors as string[] | undefined;
        const message =
          formErrors?.[0] ??
          (fieldErrors
            ? Object.values(fieldErrors).flat().join(", ")
            : "Failed to update application");
        throw new Error(message);
      }

      toast.success("Application updated!");
      router.push(`/applications/${id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const defaultValues: Partial<ApplicationFormValues> | undefined = app
    ? {
        company: app.company,
        title: app.title,
        url: app.url ?? "",
        status: app.status,
        dateApplied: app.dateApplied ?? undefined,
        source: app.source ?? undefined,
        salaryMin: app.salaryMin ?? undefined,
        salaryMax: app.salaryMax ?? undefined,
        location: app.location ?? undefined,
        remoteType: app.remoteType ?? "unknown",
        followUpDate: app.followUpDate ?? undefined,
      }
    : undefined;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Back link */}
      <div className="space-y-2">
        <Link
          href={`/applications/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Application
        </Link>
        <h1 className="text-2xl font-semibold">
          {app ? `Edit: ${app.company} — ${app.title}` : "Edit Application"}
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
      ) : error || !app ? (
        <p className="text-destructive">
          {error ?? "Application not found."}
        </p>
      ) : (
        <ApplicationForm
          onSubmit={handleSubmit}
          defaultValues={defaultValues}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
