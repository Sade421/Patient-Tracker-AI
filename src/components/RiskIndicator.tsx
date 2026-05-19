import { cn } from "@/lib/utils";

interface RiskIndicatorProps {
  probability: number;
  className?: string;
}

export function RiskIndicator({ probability, className }: RiskIndicatorProps) {
  const isHigh = probability > 0.7;
  const pct = Math.round(probability * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isHigh ? "bg-risk-high" : "bg-risk-low"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-semibold uppercase",
          isHigh ? "text-risk-high" : "text-risk-low"
        )}
      >
        {isHigh ? "HIGH" : "LOW"}
      </span>
    </div>
  );
}
