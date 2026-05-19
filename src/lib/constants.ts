export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type RemoteType = "onsite" | "hybrid" | "remote" | "unknown";
export type InterviewType = "phone" | "video" | "onsite" | "technical" | "other";
export type InterviewOutcome = "pending" | "passed" | "failed" | "cancelled";

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  wishlist: {
    label: "Wishlist",
    color: "#94a3b8",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
  },
  applied: {
    label: "Applied",
    color: "#3b82f6",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  phone_screen: {
    label: "Phone Screen",
    color: "#8b5cf6",
    bgColor: "bg-violet-100",
    textColor: "text-violet-700",
  },
  interview: {
    label: "Interview",
    color: "#f59e0b",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  offer: {
    label: "Offer",
    color: "#10b981",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  accepted: {
    label: "Accepted",
    color: "#059669",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "#6b7280",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
};

export const PIPELINE_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "phone_screen",
  "interview",
  "offer",
];

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  "accepted",
  "rejected",
  "withdrawn",
];

export const ALL_STATUSES = [...PIPELINE_STATUSES, ...TERMINAL_STATUSES];

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  unknown: "Unknown",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: "Phone",
  video: "Video",
  onsite: "On-site",
  technical: "Technical",
  other: "Other",
};

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const JOB_SOURCES = [
  "LinkedIn",
  "Indeed",
  "Seek",
  "Company Website",
  "Referral",
  "Recruiter",
  "AngelList",
  "Glassdoor",
  "Other",
];
