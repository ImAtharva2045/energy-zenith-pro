import { Panel, STATUS_MEANING, Tag, priorityTone, statusTone } from "./primitives";
import type { ZoneResult } from "@/lib/gridshield/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ZoneTable({ zones }: { zones: ZoneResult[] }) {
  return (
    <Panel
      title="Zone Allocation Matrix"
      subtitle="Live dispatch derived from DZPS, predicted demand and network constraints"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Zone", "Type", "Demand", "Predicted", "DZPS", "Allocated", "Reduction", "Status"].map((h) => (
                <th key={h} className="label-caps px-2 py-2 first:pl-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-3 pl-0">
                  <div className="font-semibold text-foreground">{z.name}</div>
                  <div className="metric text-xs text-muted-foreground">
                    {z.criticality} • min safe {z.minimumSafePower} MW
                  </div>
                </td>
                <td className="px-2 py-3 text-xs text-muted-foreground">{z.type}</td>
                <td className="metric px-2 py-3">{z.currentDemand} MW</td>
                <td className="metric px-2 py-3">
                  {z.predictedDemand} MW
                  <span
                    className={
                      z.predictedDemand > z.currentDemand
                        ? "ml-1 text-xs text-warn"
                        : z.predictedDemand < z.currentDemand
                          ? "ml-1 text-xs text-ok"
                          : "ml-1 text-xs text-muted-foreground"
                    }
                  >
                    {z.predictedDemand >= z.currentDemand ? "+" : ""}
                    {Math.round((z.predictedDemand - z.currentDemand) * 10) / 10}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex cursor-help items-center gap-2">
                        <span className="metric text-base font-semibold text-foreground">{z.dzps}</span>
                        <Tag tone={priorityTone(z.priority)}>{z.priority}</Tag>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="mb-1 font-semibold">Score contributions</p>
                      <ul className="space-y-0.5 text-xs">
                        {z.factors.map((f) => (
                          <li key={f.label}>
                            {f.label} ({f.detail}) — +{Math.round(f.contribution)} pts
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className="metric px-2 py-3 font-semibold text-foreground">{z.allocatedPower} MW</td>
                <td className="metric px-2 py-3">
                  {z.reduction > 0 ? <span className="text-warn">-{z.reduction} MW</span> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block cursor-help">
                        <Tag tone={statusTone(z.status)}>{z.status}</Tag>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{STATUS_MEANING[z.status]}</TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        PROTECTED — full demand shielded · NORMAL — demand met · REDUCED — partial supply · CURTAILED — power reduced due
        to shortage.
      </p>
    </Panel>
  );
}
