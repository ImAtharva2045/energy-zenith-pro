import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AllocationStatus, GridStatus, PriorityLevel } from "@/lib/gridshield/types";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel rounded-sm", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-2.5">
          <div>
            <h2 className="label-caps text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const toneMap = {
  ok: "bg-ok/12 text-ok border-ok/40",
  warn: "bg-warn/12 text-warn border-warn/40",
  crit: "bg-crit/15 text-crit border-crit/45",
  info: "bg-primary/12 text-primary border-primary/40",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export type Tone = keyof typeof toneMap;

export function Tag({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { ok: "bg-ok", warn: "bg-warn", crit: "bg-crit", info: "bg-primary", muted: "bg-offline" }[tone];
  return <span className={cn("inline-block size-2 rounded-full", c)} />;
}

export const statusTone = (s: AllocationStatus): Tone =>
  s === "PROTECTED" ? "info" : s === "NORMAL" ? "ok" : s === "REDUCED" ? "warn" : "crit";

export const priorityTone = (p: PriorityLevel): Tone =>
  p === "CRITICAL" ? "crit" : p === "HIGH" ? "warn" : p === "MEDIUM" ? "info" : "muted";

export const gridTone = (s: GridStatus): Tone => (s === "NORMAL" ? "ok" : s === "WARNING" ? "warn" : "crit");

export const STATUS_MEANING: Record<AllocationStatus, string> = {
  PROTECTED: "Full demand met and shielded from curtailment.",
  NORMAL: "Full predicted demand supplied.",
  REDUCED: "Partly reduced — supply below requested demand.",
  CURTAILED: "Power reduced due to shortage — only essential load served.",
};

export function Meter({ value, tone = "info" }: { value: number; tone?: Tone }) {
  const bar = { ok: "bg-ok", warn: "bg-warn", crit: "bg-crit", info: "bg-primary", muted: "bg-offline" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-xs bg-secondary">
      <div className={cn("h-full transition-all duration-500", bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
