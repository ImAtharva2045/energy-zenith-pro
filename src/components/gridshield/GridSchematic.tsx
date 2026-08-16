import { Panel, Tag, gridTone, statusTone } from "./primitives";
import type { GridTelemetry, ZoneResult } from "@/lib/gridshield/types";
import { cn } from "@/lib/utils";
import { Activity, Building2, Cross, Droplets, Home } from "lucide-react";

const ICONS = {
  Hospital: Cross,
  "Water Treatment": Droplets,
  Residential: Home,
  Commercial: Building2,
} as const;

export function GridSchematic({
  zones,
  telemetry,
  supply,
}: {
  zones: ZoneResult[];
  telemetry: GridTelemetry;
  supply: { deliverable: number; generation: number; batteryMw: number; networkLimited: boolean };
}) {
  return (
    <Panel
      title="Simulated Substation — 11 kV Feeder"
      subtitle="Synthetic telemetry. Not connected to any SCADA/DMS system."
      right={<Tag tone={gridTone(telemetry.status)}>{telemetry.status}</Tag>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Voltage", `${telemetry.voltageKv} kV`],
          ["Current", `${telemetry.currentA.toLocaleString()} A`],
          ["Frequency", `${telemetry.frequencyHz.toFixed(2)} Hz`],
          ["Feeder loading", `${telemetry.feederLoadingPct}%`],
          ["Transformer loading", `${telemetry.transformerLoadingPct}%`],
          ["Deliverable power", `${supply.deliverable} MW`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-sm border border-border bg-secondary/30 px-3 py-2">
            <div className="label-caps">{k}</div>
            <div className="metric mt-0.5 text-base text-foreground">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-3 rounded-sm border border-primary/40 bg-primary/10 px-3 py-2">
          <Activity className="size-4 text-primary" />
          <div>
            <div className="text-sm font-semibold text-foreground">SUBSTATION SS-01</div>
            <div className="metric text-xs text-muted-foreground">
              Generation {supply.generation} MW (incl. {supply.batteryMw} MW battery)
              {supply.networkLimited ? " — limited by network capacity" : ""}
            </div>
          </div>
        </div>

        <div className="ml-6 border-l border-border pl-6">
          <div className="py-2 text-xs text-muted-foreground">FEEDER F-01</div>
          <div className="grid gap-2 md:grid-cols-2">
            {zones.map((z) => {
              const Icon = ICONS[z.type];
              const tone = statusTone(z.status);
              const ring = {
                ok: "border-ok/50 bg-ok/8",
                warn: "border-warn/50 bg-warn/8",
                crit: "border-crit/50 bg-crit/10",
                info: "border-primary/50 bg-primary/8",
                muted: "border-border bg-secondary/30",
              }[tone];
              const pct = z.predictedDemand ? (z.allocatedPower / z.predictedDemand) * 100 : 0;
              return (
                <div key={z.id} className={cn("relative rounded-sm border p-3", ring)}>
                  <span className="absolute -left-6 top-1/2 h-px w-6 bg-border" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-foreground/80" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{z.name}</div>
                        <div className="metric text-xs text-muted-foreground">
                          {z.allocatedPower} / {z.predictedDemand} MW · DZPS {z.dzps}
                        </div>
                      </div>
                    </div>
                    <Tag tone={tone}>{z.status}</Tag>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-xs bg-secondary">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        { ok: "bg-ok", warn: "bg-warn", crit: "bg-crit", info: "bg-primary", muted: "bg-offline" }[tone],
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
