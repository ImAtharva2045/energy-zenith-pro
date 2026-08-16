import { Panel, Tag } from "./primitives";
import { PREDICTION_MODEL_LABEL } from "@/lib/gridshield/engine";
import type { ZoneResult } from "@/lib/gridshield/types";

export function PredictionPanel({ zones }: { zones: ZoneResult[] }) {
  return (
    <Panel
      title="Demand Prediction"
      subtitle="Disaster-aware near-term forecast (next 30 min block)"
      right={<Tag tone="warn">MODEL DEMO</Tag>}
    >
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {PREDICTION_MODEL_LABEL}. No trained XGBoost model is executing in the browser — the prediction service exposes
        the same feature set (previous demand, disaster severity, rainfall, facility workload, ICU occupancy, emergency
        activity, solar generation, battery availability) so it can be swapped for a real model endpoint.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {zones.map((z) => {
          const delta = Math.round((z.predictedDemand - z.currentDemand) * 10) / 10;
          return (
            <div key={z.id} className="rounded-sm border border-border bg-secondary/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground">{z.name}</span>
                <span className={delta > 0 ? "metric text-sm text-warn" : delta < 0 ? "metric text-sm text-ok" : "metric text-sm text-muted-foreground"}>
                  {delta > 0 ? "+" : ""}
                  {delta} MW
                </span>
              </div>
              <div className="metric mt-1 text-xs text-muted-foreground">
                current {z.currentDemand} MW → predicted {z.predictedDemand} MW
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {z.predictionFactors.length ? (
                  z.predictionFactors.map((f) => (
                    <li key={f.label}>
                      {f.label}: {f.deltaMw > 0 ? "+" : ""}
                      {f.deltaMw} MW
                    </li>
                  ))
                ) : (
                  <li>No significant driver — baseline load expected.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
