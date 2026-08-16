import { Panel } from "./primitives";
import type { LogEntry } from "@/lib/gridshield/types";
import { cn } from "@/lib/utils";

export function ActivityLog({ log }: { log: LogEntry[] }) {
  return (
    <Panel title="Decision & Activity Log" subtitle="Every scenario change, recommendation and operator action">
      <ol className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {log.map((e, i) => (
          <li key={`${e.time}-${i}`} className="flex gap-3 border-b border-border/50 pb-2 last:border-0">
            <span className="metric shrink-0 text-xs text-muted-foreground">{e.time}</span>
            <span
              className={cn(
                "shrink-0 mt-1 size-1.5 rounded-full",
                e.kind === "operator" ? "bg-warn" : e.kind === "scenario" ? "bg-crit" : "bg-primary",
              )}
            />
            <span className="text-xs leading-relaxed text-foreground/90">{e.message}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
