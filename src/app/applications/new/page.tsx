"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ApplicationFormValues } from "@/lib/validations";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { buttonVariants } from "@/components/ui/button";

const today = new Date().toISOString().split("T")[0];
const followUpDefault = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default function NewApplicationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: ApplicationFormValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message =
          errorBody?.error?.formErrors?.[0] ??
          errorBody?.error?.fieldErrors
            ? Object.values(errorBody.error.fieldErrors as Record<string, string[]>)
                .flat()
                .join(", ")
            : "Failed to create application";
        throw new Error(message);
      }

      const app = await res.json();
      toast.success("Application created!");
      router.push(`/applications/${app.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="space-y-1">
        <Link href="/applications" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
          <ArrowLeft className="size-4" />
          Back to Applications
        </Link>
        <h1 className="text-2xl font-semibold">New Application</h1>
      </div>

      <ApplicationForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        defaultValues={{ dateApplied: today, followUpDate: followUpDefault }}
      />
    </div>
  );
}
