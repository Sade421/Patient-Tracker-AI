import { cn } from "@/lib/utils";

interface TriageBadgeProps {
  level: string;
  className?: string;
}

const triageConfig: Record<string, { label: string; colorClass: string; pulse?: boolean }> = {
  red: { label: "Immediate", colorClass: "bg-triage-red text-white", pulse: true },
  yellow: { label: "Urgent", colorClass: "bg-triage-yellow text-black" },
  green: { label: "Routine", colorClass: "bg-triage-green text-black" },
  black: { label: "Critical", colorClass: "bg-triage-black text-white" },
};

export function TriageBadge({ level, className }: TriageBadgeProps) {
  const config = triageConfig[level] ?? { label: level, colorClass: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        config.colorClass,
        config.pulse && "triage-pulse-red",
        className
      )}
    >
      {config.label}
    </span>
  );
}
