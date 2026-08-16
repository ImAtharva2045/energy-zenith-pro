import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, Tag } from "./primitives";
import type { Gridshield } from "@/lib/gridshield/store";
import { Check, X, SlidersHorizontal, RefreshCw } from "lucide-react";

export function RecommendationPanel({ gs }: { gs: Gridshield }) {
  const { recommendation: rec, proposedZones, liveZones, approve, reject, override, decision, reassess, reassessedAt } = gs;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const openOverride = () => {
    setDraft(Object.fromEntries(liveZones.map((z) => [z.id, String(z.allocatedPower)])));
    setEditing(true);
  };

  const decisionTag =
    decision === "approved"
      ? { tone: "ok" as const, text: "APPROVED" }
      : decision === "rejected"
        ? { tone: "crit" as const, text: "REJECTED" }
        : decision === "override"
          ? { tone: "warn" as const, text: "OPERATOR OVERRIDE" }
          : { tone: "info" as const, text: "AWAITING OPERATOR" };

  return (
    <Panel
      title="GRIDSHIELD Recommendation"
      subtitle="Rule-based explanation generated from current simulated values"
      right={
        <div className="flex items-center gap-2">
          <Tag tone={decisionTag.tone}>{decisionTag.text}</Tag>
        </div>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="metric text-xs text-muted-foreground">
          Last reassessment {reassessedAt} · Next automatic reassessment: 15 min
        </div>
        <Button size="sm" variant="secondary" onClick={reassess} className="gap-1.5 text-xs font-semibold">
          <RefreshCw className="size-3.5" /> REASSESS GRID
        </Button>
      </div>

      <h3 className="text-lg font-semibold leading-snug text-foreground">{rec.headline}</h3>

      <div className="mt-3 rounded-sm border border-border bg-secondary/40 p-3">
        <div className="label-caps mb-1">Why?</div>
        <p className="text-sm leading-relaxed text-foreground/90">{rec.explanation}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="label-caps mb-2">Affected zones &amp; power change</div>
          {rec.affectedZones.length ? (
            <ul className="space-y-1.5">
              {rec.affectedZones.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-border/60 pb-1 text-sm">
                  <span>{a.name}</span>
                  <span className={a.deltaMw < 0 ? "metric text-crit" : "metric text-ok"}>
                    {a.deltaMw > 0 ? "+" : ""}
                    {a.deltaMw} MW
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No change to current dispatch.</p>
          )}
        </div>
        <div>
          <div className="label-caps mb-2">Priority factors</div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {rec.priorityFactors.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 rounded-sm border border-warn/40 bg-warn/8 p-3">
          <div className="label-caps mb-2 text-warn">Manual override — MW per zone</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {liveZones.map((z) => (
              <label key={z.id} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 truncate text-muted-foreground">{z.name}</span>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={draft[z.id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [z.id]: e.target.value }))}
                  className="metric h-8"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                override(Object.fromEntries(liveZones.map((z) => [z.id, Number(draft[z.id]) || 0])));
                setEditing(false);
              }}
            >
              Apply override
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={approve} disabled={!rec.hasChange} className="gap-1.5 font-semibold">
            <Check className="size-4" /> APPROVE
          </Button>
          <Button size="sm" variant="destructive" onClick={reject} disabled={!rec.hasChange} className="gap-1.5 font-semibold">
            <X className="size-4" /> REJECT
          </Button>
          <Button size="sm" variant="outline" onClick={openOverride} className="gap-1.5 font-semibold">
            <SlidersHorizontal className="size-4" /> OVERRIDE
          </Button>
          <span className="metric self-center text-xs text-muted-foreground">
            Proposed total {Math.round(proposedZones.reduce((a, z) => a + z.allocatedPower, 0) * 10) / 10} MW
          </span>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        GRIDSHIELD is decision support only — no allocation is applied without an operator action.
      </p>
    </Panel>
  );
}
