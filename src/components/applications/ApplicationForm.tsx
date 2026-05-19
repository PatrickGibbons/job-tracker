"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { applicationSchema, ApplicationFormValues } from "@/lib/validations";
import {
  ALL_STATUSES,
  JOB_SOURCES,
  REMOTE_TYPE_LABELS,
  STATUS_CONFIG,
  RemoteType,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormValues) => Promise<void>;
  defaultValues?: Partial<ApplicationFormValues>;
  isLoading?: boolean;
}

export function ApplicationForm({
  onSubmit,
  defaultValues,
  isLoading = false,
}: ApplicationFormProps) {
  const [isScraping, setIsScraping] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<string[] | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema) as any,
    defaultValues: {
      status: "wishlist",
      remoteType: "unknown",
      ...defaultValues,
    },
  });

  const statusValue = watch("status");
  const sourceValue = watch("source");
  const remoteTypeValue = watch("remoteType");

  async function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted.startsWith("http")) return;

    setIsScraping(true);
    setAutoFilledFields(null);
    try {
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pasted }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Could not extract job info from URL");
        return;
      }

      const data = await res.json();
      const filled: string[] = [];

      if (data.title) { setValue("title", data.title, { shouldDirty: true }); filled.push("title"); }
      if (data.company) { setValue("company", data.company, { shouldDirty: true }); filled.push("company"); }
      if (data.location) { setValue("location", data.location, { shouldDirty: true }); filled.push("location"); }
      if (data.remoteType && data.remoteType !== "unknown") {
        setValue("remoteType", data.remoteType as RemoteType, { shouldDirty: true });
        filled.push("remote type");
      }
      if (data.salaryMin) { setValue("salaryMin", data.salaryMin, { shouldDirty: true }); filled.push("salary"); }
      if (data.salaryMax) setValue("salaryMax", data.salaryMax, { shouldDirty: true });

      if (filled.length > 0) {
        setAutoFilledFields(filled);
        toast.success(`Auto-filled: ${filled.join(", ")}`);
      } else {
        toast.info("Could not extract job details from this URL");
      }
    } catch {
      toast.error("Failed to extract job info");
    } finally {
      setIsScraping(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company */}
          <div className="space-y-1">
            <Label htmlFor="company">
              Company <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company"
              placeholder="Acme Corp"
              {...register("company")}
              aria-invalid={!!errors.company}
            />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Software Engineer"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between min-h-5">
              <Label htmlFor="url">Job URL</Label>
              {isScraping && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Detecting job info...
                </span>
              )}
              {autoFilledFields && !isScraping && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Wand2 className="size-3" />
                  Auto-filled: {autoFilledFields.join(", ")}
                </span>
              )}
            </div>
            <Input
              id="url"
              type="url"
              placeholder="Paste job URL to auto-fill details..."
              {...register("url")}
              onPaste={handleUrlPaste}
              aria-invalid={!!errors.url}
            />
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue}
              onValueChange={(val) =>
                setValue("status", val as ApplicationFormValues["status"])
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-xs text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Date Applied */}
          <div className="space-y-1">
            <Label htmlFor="dateApplied">Date Applied</Label>
            <Input
              id="dateApplied"
              type="date"
              {...register("dateApplied")}
            />
          </div>

          {/* Source */}
          <div className="space-y-1">
            <Label htmlFor="source">Source</Label>
            <Select
              value={sourceValue ?? ""}
              onValueChange={(val) => setValue("source", val ?? undefined)}
            >
              <SelectTrigger id="source" className="w-full">
                <SelectValue placeholder="Where did you find this job?" />
              </SelectTrigger>
              <SelectContent>
                {JOB_SOURCES.map((src) => (
                  <SelectItem key={src} value={src}>
                    {src}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="salaryMin">Salary Min</Label>
              <Input
                id="salaryMin"
                type="number"
                placeholder="50000"
                {...register("salaryMin")}
                aria-invalid={!!errors.salaryMin}
              />
              {errors.salaryMin && (
                <p className="text-xs text-destructive">{errors.salaryMin.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="salaryMax">Salary Max</Label>
              <Input
                id="salaryMax"
                type="number"
                placeholder="80000"
                {...register("salaryMax")}
                aria-invalid={!!errors.salaryMax}
              />
              {errors.salaryMax && (
                <p className="text-xs text-destructive">{errors.salaryMax.message}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="New York, NY"
              {...register("location")}
            />
          </div>

          {/* Remote Type */}
          <div className="space-y-1">
            <Label htmlFor="remoteType">Remote Type</Label>
            <Select
              value={remoteTypeValue ?? "unknown"}
              onValueChange={(val) =>
                setValue("remoteType", val as RemoteType)
              }
            >
              <SelectTrigger id="remoteType" className="w-full">
                <SelectValue placeholder="Select remote type" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REMOTE_TYPE_LABELS) as [RemoteType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up Date */}
          <div className="space-y-1">
            <Label htmlFor="followUpDate">Follow-up Date</Label>
            <Input
              id="followUpDate"
              type="date"
              {...register("followUpDate")}
            />
          </div>

          <Button type="submit" disabled={isLoading || isScraping} className="w-full">
            {isLoading ? "Saving..." : "Save Application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
