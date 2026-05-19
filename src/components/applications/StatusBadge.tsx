import { STATUS_CONFIG } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status as ApplicationStatus];
  if (!cfg) return <span className={className}>{status}</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.bgColor,
        cfg.textColor,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
