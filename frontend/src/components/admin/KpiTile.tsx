import type { IconComponent } from "../ui/icons";
import { CountUp } from "../ui/CountUp";
import { cn } from "../../lib/cn";

interface KpiTileProps {
  label: string;
  value: number;

  format?: (value: number) => string;
  icon: IconComponent;
  hint?: string;

  tone?: "default" | "warn" | "danger";
  index?: number;
}

const toneClasses = {
  default: "text-accent bg-accent/10",
  warn: "text-warn bg-warn-soft",
  danger: "text-danger bg-danger-soft",
} as const;

export function KpiTile({
  label,
  value,
  format,
  icon: Icon,
  hint,
  tone = "default",
  index = 0,
}: KpiTileProps) {
  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className="animate-rise flex flex-col gap-3 rounded-tile bg-surface p-4 ring-1 ring-line"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid size-9 place-items-center rounded-control", toneClasses[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>

      <div>
        <p className="text-2xl font-black tabular-nums text-ink">
          <CountUp value={value} format={format} />
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          {label}
        </p>
        {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}
