import { z } from "zod";

export const applicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum([
    "wishlist",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
  ]),
  dateApplied: z.string().optional(),
  source: z.string().optional(),
  salaryMin: z.coerce.number().positive().optional().nullable(),
  salaryMax: z.coerce.number().positive().optional().nullable(),
  location: z.string().optional(),
  remoteType: z.enum(["onsite", "hybrid", "remote", "unknown"]).optional(),
  followUpDate: z.string().optional(),
  archived: z.boolean().optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

export const interviewSchema = z.object({
  type: z.enum(["phone", "video", "onsite", "technical", "other"]),
  scheduledAt: z.string().min(1, "Date and time are required"),
  durationMinutes: z.coerce.number().positive().optional().nullable(),
  location: z.string().optional(),
  interviewers: z.string().optional(),
  outcome: z.enum(["pending", "passed", "failed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export type InterviewFormValues = z.infer<typeof interviewSchema>;

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});
