import Papa from "papaparse";
import { STATUS_CONFIG, REMOTE_TYPE_LABELS } from "./constants";
import type { ApplicationStatus, RemoteType } from "./constants";

type ApplicationRow = {
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
  createdAt: string;
};

export function exportApplicationsToCSV(applications: ApplicationRow[]): string {
  const rows = applications.map((app) => ({
    ID: app.id,
    Company: app.company,
    "Job Title": app.title,
    URL: app.url ?? "",
    Status: STATUS_CONFIG[app.status as ApplicationStatus]?.label ?? app.status,
    "Date Applied": app.dateApplied ?? "",
    Source: app.source ?? "",
    "Salary Min": app.salaryMin ?? "",
    "Salary Max": app.salaryMax ?? "",
    Location: app.location ?? "",
    "Remote Type": REMOTE_TYPE_LABELS[app.remoteType as RemoteType] ?? "",
    "Follow-up Date": app.followUpDate ?? "",
    "Created At": app.createdAt,
  }));

  return Papa.unparse(rows);
}
