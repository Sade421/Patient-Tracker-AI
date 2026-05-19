import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; colorClass: string }> = {
  waiting: { label: "Waiting", colorClass: "bg-status-waiting/15 text-status-waiting border border-status-waiting/30" },
  in_progress: { label: "In Progress", colorClass: "bg-status-in-progress/15 text-status-in-progress border border-status-in-progress/30" },
  completed: { label: "Completed", colorClass: "bg-status-completed/15 text-status-completed border border-status-completed/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, colorClass: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        config.colorClass,
        className
      )}
    >
      {config.label}
    </span>
  );
}
