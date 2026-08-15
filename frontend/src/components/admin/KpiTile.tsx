import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "../ui/CountUp";
import { cn } from "../../lib/cn";

interface KpiTileProps {
  label: string;
  value: number;
  /** Formats the counting value, e.g. as currency. Defaults to a thousands-separated integer. */
  format?: (value: number) => string;
  icon: LucideIcon;
  hint?: string;
  /** Tints the tile — use `warn`/`danger` for numbers that need action. */
  tone?: "default" | "warn" | "danger";
  index?: number;
}

const toneClasses = {
  default: "text-accent bg-accent/10",
  warn: "text-warn bg-warn-soft",
  danger: "text-danger bg-danger-soft",
} as const;

/**
 * One headline figure on the dashboard, with the number counting up on mount.
 *
 * The count is the "animated KPI" SUBJECT.md Phase 6 asks for. It is more than decoration: a number
 * that animates draws the eye to what changed, which on a dashboard of nine figures is genuinely
 * useful. {@link CountUp} skips the animation entirely under reduced motion.
 */
export function KpiTile({
  label,
  value,
  format,
  icon: Icon,
  hint,
  tone = "default",
  index = 0,
}: KpiTileProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: index * 0.05 }}
      className="flex flex-col gap-3 rounded-tile bg-surface p-4 ring-1 ring-line"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid size-9 place-items-center rounded-control", toneClasses[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>

      <div>
        {/* `tabular-nums` keeps the digits the same width, so a counting number does not
            visibly jitter as it changes. Essential when animating figures. */}
        <p className="text-2xl font-black tabular-nums text-ink">
          <CountUp value={value} format={format} />
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          {label}
        </p>
        {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
      </div>
    </motion.div>
  );
}
