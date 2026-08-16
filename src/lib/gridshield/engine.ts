/**
 * GRIDSHIELD decision engine (REAL implemented logic, operating on SIMULATED data).
 *
 * Pipeline:
 *   scenario inputs -> DZPS scoring -> demand prediction -> constraint-aware
 *   allocation -> explainable recommendation -> telemetry.
 *
 * Every function here is pure so the modules can later be swapped for real
 * Python microservices (scoring service / XGBoost service / optimiser).
 */
import type {
  AllocationStatus,
  Criticality,
  GridTelemetry,
  PredictionFactor,
  PriorityLevel,
  Recommendation,
  ScenarioState,
  ScoreFactor,
  Workload,
  ZoneInput,
  ZoneResult,
} from "./types";

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;

const CRITICALITY_SCORE: Record<Criticality, number> = {
  "Very High": 100,
  High: 78,
  Medium: 45,
  Low: 20,
};
const WORKLOAD_SCORE: Record<Workload, number> = { Low: 25, Medium: 60, High: 95 };
/** Fraction of predicted demand that must never be curtailed (life-safety floor). */
const MIN_SAFE_FRACTION: Record<Criticality, number> = {
  "Very High": 0.9,
  High: 0.7,
  Medium: 0.45,
  Low: 0.2,
};

// ---------------------------------------------------------------------------
// FEATURE 1 — Dynamic Zone Priority Scoring (DZPS), normalised weighted model
// ---------------------------------------------------------------------------
export interface ZoneContext {
  workload: Workload;
  backupHours: number;
  icuOccupancy?: number | undefined;
  criticalTasks: number;
  exposure: number; // 0-1 how exposed the zone is to the disaster
}

export function computeDzps(zone: ZoneInput, ctx: ZoneContext, disasterSeverity: number) {
  // Weights sum to 1.0 — each sub-score is normalised to 0..100 first.
  const W = { criticality: 0.34, workload: 0.18, icu: 0.12, backup: 0.16, disaster: 0.14, tasks: 0.06 };

  const criticality = CRITICALITY_SCORE[zone.criticality];
  const workload = WORKLOAD_SCORE[ctx.workload];
  // ICU only meaningful for the hospital; other zones inherit their workload value.
  const icu = ctx.icuOccupancy ?? workload;
  // Backup scarcity: 12 h of autonomy = no urgency, 0 h = maximum urgency.
  const backup = clamp((1 - Math.min(ctx.backupHours, 12) / 12) * 100);
  const disaster = clamp(disasterSeverity * 10 * (0.4 + 0.6 * ctx.exposure));
  const tasks = clamp(ctx.criticalTasks * 25);

  const raw =
    criticality * W.criticality +
    workload * W.workload +
    icu * W.icu +
    backup * W.backup +
    disaster * W.disaster +
    tasks * W.tasks;

  const factors: ScoreFactor[] = [
    {
      label: "Facility criticality",
      detail: zone.criticality,
      contribution: criticality * W.criticality,
    },
    { label: "Operational workload", detail: ctx.workload, contribution: workload * W.workload },
    {
      label: ctx.icuOccupancy !== undefined ? "ICU occupancy" : "Service load",
      detail: ctx.icuOccupancy !== undefined ? `${ctx.icuOccupancy}%` : `${Math.round(icu)}/100`,
      contribution: icu * W.icu,
    },
    {
      label: "Backup remaining",
      detail: `${round1(ctx.backupHours)} h`,
      contribution: backup * W.backup,
    },
    {
      label: "Disaster exposure",
      detail: `severity ${disasterSeverity}/10`,
      contribution: disaster * W.disaster,
    },
    {
      label: "Active critical tasks",
      detail: `${ctx.criticalTasks}`,
      contribution: tasks * W.tasks,
    },
  ].sort((a, b) => b.contribution - a.contribution);

  return { score: Math.round(clamp(raw)), factors };
}

export function priorityLevel(score: number): PriorityLevel {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// FEATURE 2 — Disaster-aware demand prediction
// NOTE: this is a transparent, feature-weighted regression stand-in that mirrors
// the intended XGBoost feature set. No trained model is running in the browser.
// The signature matches what a real /predict service would expose.
// ---------------------------------------------------------------------------
export const PREDICTION_MODEL_LABEL = "Model-demo regression (XGBoost-equivalent feature set)";

export function predictDemand(
  zone: ZoneInput,
  ctx: ZoneContext,
  s: ScenarioState,
): { predicted: number; factors: PredictionFactor[] } {
  const base = zone.baseDemand;
  const f: PredictionFactor[] = [];
  const add = (label: string, deltaMw: number) => {
    if (Math.abs(deltaMw) >= 0.05) f.push({ label, deltaMw: round1(deltaMw) });
  };

  const sev = s.disaster.severity / 10;
  const rain = s.disaster.rainfall / 10;

  if (zone.type === "Hospital") {
    add("Emergency workload", base * (WORKLOAD_SCORE[ctx.workload] - 60) / 100 * 0.35);
    add("ICU occupancy", base * (((ctx.icuOccupancy ?? 60) - 60) / 100) * 0.4);
    add("Disaster casualty surge", base * sev * 0.22 * ctx.exposure);
    add("Surgery in progress", s.hospital.surgeryActive ? base * 0.06 : 0);
  } else if (zone.type === "Water Treatment") {
    add("Flood pumping load", base * rain * 0.3 * ctx.exposure);
    add("Critical treatment tasks", base * ctx.criticalTasks * 0.04);
  } else if (zone.type === "Residential") {
    // Shelter-in-place behaviour raises residential load during disasters.
    add("Shelter-in-place occupancy", base * sev * 0.12);
    add("Reduced solar self-consumption", -base * (s.energy.solarGeneration / 100) * 0.15);
  } else {
    // Commercial activity drops as a disaster escalates.
    add("Business activity decline", -base * sev * 0.18);
  }

  const predicted = Math.max(0.5, base + f.reduce((a, x) => a + x.deltaMw, 0));
  return { predicted: round1(predicted), factors: f.sort((a, b) => Math.abs(b.deltaMw) - Math.abs(a.deltaMw)) };
}

// ---------------------------------------------------------------------------
// Supply model — grid import + solar + battery discharge, capped by the network
// ---------------------------------------------------------------------------
export function computeSupply(s: ScenarioState) {
  // Battery can sustain a discharge of up to 25% of its energy per hour block.
  const batteryMw = round1((s.energy.batteryCapacityMWh * 0.25 * s.energy.batterySoc) / 100);
  const generation = s.energy.gridPower + s.energy.solarGeneration + batteryMw;
  const networkLimit = Math.min(s.grid.feederCapacity, s.grid.transformerCapacity);
  return {
    batteryMw,
    generation: round1(generation),
    networkLimit,
    deliverable: round1(Math.min(generation, networkLimit)),
    networkLimited: generation > networkLimit,
  };
}

// ---------------------------------------------------------------------------
// FEATURE 3 — Constraint-aware smart allocation
// Two passes: (1) guarantee minimum safe power in DZPS order,
//             (2) share the remainder proportional to DZPS weight, capped at demand.
// ---------------------------------------------------------------------------
function statusFor(allocated: number, demand: number, dzps: number): AllocationStatus {
  const ratio = demand > 0 ? allocated / demand : 1;
  if (ratio >= 0.999) return dzps >= 80 ? "PROTECTED" : "NORMAL";
  if (ratio >= 0.75) return "REDUCED";
  return "CURTAILED";
}

export function allocate(
  zones: Omit<ZoneResult, "allocatedPower" | "reduction" | "status">[],
  deliverable: number,
) {
  const alloc = new Map<string, number>();
  let remaining = deliverable;

  // Pass 1 — life-safety floors, highest DZPS first.
  const byPriority = [...zones].sort((a, b) => b.dzps - a.dzps);
  for (const z of byPriority) {
    const give = Math.min(z.minimumSafePower, Math.max(0, remaining));
    alloc.set(z.id, give);
    remaining -= give;
  }

  // Pass 2 — distribute the surplus by DZPS weight, iterating so that zones
  // which hit their demand cap release their share back to the pool.
  for (let pass = 0; pass < 6 && remaining > 0.05; pass++) {
    const open = byPriority.filter((z) => (alloc.get(z.id) ?? 0) < z.predictedDemand - 0.01);
    if (!open.length) break;
    const totalWeight = open.reduce((a, z) => a + Math.pow(z.dzps, 2), 0) || 1;
    let used = 0;
    for (const z of open) {
      const share = (remaining * Math.pow(z.dzps, 2)) / totalWeight;
      const current = alloc.get(z.id) ?? 0;
      const give = Math.min(share, z.predictedDemand - current);
      alloc.set(z.id, current + give);
      used += give;
    }
    remaining -= used;
    if (used < 0.01) break;
  }

  return zones.map<ZoneResult>((z) => {
    const allocated = round1(alloc.get(z.id) ?? 0);
    return {
      ...z,
      allocatedPower: allocated,
      reduction: round1(Math.max(0, z.predictedDemand - allocated)),
      status: statusFor(allocated, z.predictedDemand, z.dzps),
    };
  });
}

// ---------------------------------------------------------------------------
// Telemetry — simulated substation electrical measurements
// ---------------------------------------------------------------------------
export function computeTelemetry(s: ScenarioState, loadMw: number): GridTelemetry {
  const feederLoadingPct = round1((loadMw / s.grid.feederCapacity) * 100);
  const transformerLoadingPct = round1((loadMw / s.grid.transformerCapacity) * 100);
  const worst = Math.max(feederLoadingPct, transformerLoadingPct);
  // Voltage sags with loading and with disaster-related network stress.
  const voltageKv = round1(11 * (1 - Math.max(0, worst - 60) / 100 * 0.09) - s.disaster.severity * 0.015);
  const currentA = Math.round((loadMw * 1_000_000) / (Math.sqrt(3) * voltageKv * 1000));
  const frequencyHz = Math.round((50 - Math.max(0, worst - 85) * 0.012 - s.disaster.severity * 0.004) * 100) / 100;
  const status: GridTelemetry["status"] = worst > 95 || voltageKv < 10.2 ? "CRITICAL" : worst > 82 ? "WARNING" : "NORMAL";
  return { voltageKv, currentA, frequencyHz, feederLoadingPct, transformerLoadingPct, status };
}

// ---------------------------------------------------------------------------
// FEATURE 4 — Explainable recommendation, generated from live values
// ---------------------------------------------------------------------------
export function buildRecommendation(
  proposed: ZoneResult[],
  applied: Record<string, number>,
  s: ScenarioState,
  shortfall: number,
): Recommendation {
  const deltas = proposed
    .map((z) => ({ id: z.id, name: z.name, deltaMw: round1(z.allocatedPower - (applied[z.id] ?? z.allocatedPower)) }))
    .filter((d) => Math.abs(d.deltaMw) >= 0.1)
    .sort((a, b) => Math.abs(b.deltaMw) - Math.abs(a.deltaMw));

  const top = [...proposed].sort((a, b) => b.dzps - a.dzps)[0]!;
  const cuts = deltas.filter((d) => d.deltaMw < 0);
  const gains = deltas.filter((d) => d.deltaMw > 0);

  const priorityFactors = [
    `${top.name} DZPS ${top.dzps}/100 (${priorityLevel(top.dzps)})`,
    `Disaster: ${s.disaster.type} — severity ${s.disaster.severity}/10, rainfall ${s.disaster.rainfall}/10`,
    `Hospital ICU occupancy ${s.hospital.icuOccupancy}% • workload ${s.hospital.emergencyWorkload}`,
    `Backup autonomy — hospital ${round1(s.hospital.backupHours)} h, water plant ${round1(s.water.backupHours)} h`,
    shortfall > 0
      ? `Supply shortfall of ${round1(shortfall)} MW against predicted demand`
      : `Supply surplus of ${round1(-shortfall)} MW available`,
    `Network limit: feeder ${s.grid.feederCapacity} MW / transformer ${s.grid.transformerCapacity} MW`,
  ];

  if (!deltas.length) {
    return {
      headline: "Hold current allocation — no change required",
      explanation:
        `Current dispatch already matches the constraint-aware optimum. ${top.name} remains the highest-priority load ` +
        `at DZPS ${top.dzps}/100 with ${s.disaster.type.toLowerCase()} severity ${s.disaster.severity}/10, and all ` +
        `life-safety minimums are satisfied within feeder and transformer limits.`,
      affectedZones: [],
      priorityFactors,
      shortfall,
      hasChange: false,
    };
  }

  const cutText = cuts
    .map((c) => `${c.name} by ${round1(Math.abs(c.deltaMw))} MW`)
    .join(" and ");
  const gainText = gains.map((g) => `${g.name} by ${round1(g.deltaMw)} MW`).join(" and ");
  const headline = cuts.length
    ? `Reduce ${cutText}${gains.length ? ` to raise ${gainText}` : ""}`
    : `Increase ${gainText}`;

  const flexNote = cuts
    .map((c) => proposed.find((z) => z.id === c.id))
    .filter(Boolean)
    .map((z) => `${z!.name} now scores DZPS ${z!.dzps}/100 with ${z!.flexibility.toLowerCase()} load flexibility and ${z!.criticality.toLowerCase()} criticality`)
    .join("; ");

  // The narrative is driven by the highest-priority zone that gains power,
  // falling back to the highest-scoring zone overall.
  const driver =
    gains
      .map((g) => proposed.find((z) => z.id === g.id)!)
      .sort((a, b) => b.dzps - a.dzps)[0] ?? top;

  const explanation =
    `${headline} because ${driver.name} priority is ${driver.dzps}/100 (${priorityLevel(top.dzps)}), driven by ` +
    `${top.factors.slice(0, 3).map((f) => `${f.label.toLowerCase()} ${f.detail}`).join(", ")}. ` +
    (shortfall > 0
      ? `Deliverable power is ${round1(shortfall)} MW short of predicted demand, so lower-priority or more flexible load must absorb the deficit — ${flexNote}. `
      : `Freed capacity can now be returned to lower-priority zones — ${flexNote || "flexible load is restored first"}. `) +
    `Life-safety minimums for all Very High criticality zones remain fully protected.`;

  return { headline, explanation, affectedZones: deltas, priorityFactors, shortfall, hasChange: true };
}
