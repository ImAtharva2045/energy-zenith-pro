/** GRIDSHIELD application state: scenario inputs + derived pipeline + operator actions. */
import { useCallback, useMemo, useState } from "react";
import {
  allocate,
  buildRecommendation,
  computeDzps,
  computeSupply,
  computeTelemetry,
  predictDemand,
  priorityLevel,
  round1,
  type ZoneContext,
} from "./engine";
import type { LogEntry, ScenarioState, Workload, ZoneInput, ZoneResult } from "./types";

const ZONES: Record<string, ZoneInput> = {
  H01: { id: "H01", name: "Hospital H01", type: "Hospital", criticality: "Very High", flexibility: "Low", baseDemand: 20 },
  W01: { id: "W01", name: "Water Plant W01", type: "Water Treatment", criticality: "Very High", flexibility: "Low", baseDemand: 15 },
  R01: { id: "R01", name: "Residential R01", type: "Residential", criticality: "Medium", flexibility: "Medium", baseDemand: 30 },
  C01: { id: "C01", name: "Commercial C01", type: "Commercial", criticality: "Low", flexibility: "High", baseDemand: 25 },
};

export const INITIAL_SCENARIO: ScenarioState = {
  disaster: { type: "Urban Flood", severity: 1, rainfall: 1, affectedZones: [] },
  hospital: { icuOccupancy: 70, emergencyWorkload: "Medium", surgeryActive: false, backupHours: 4 },
  water: { backupHours: 5, criticalTasks: 1 },
  energy: { gridPower: 88, solarGeneration: 8, batterySoc: 80, batteryCapacityMWh: 20 },
  grid: { feederCapacity: 110, transformerCapacity: 105 },
  zones: ZONES,
};

const MIN_SAFE_FRACTION = { "Very High": 0.9, High: 0.7, Medium: 0.45, Low: 0.2 } as const;

function exposureFor(id: string, s: ScenarioState) {
  const listed = s.disaster.affectedZones.includes(id);
  const base = id === "W01" ? 0.9 : id === "H01" ? 0.6 : id === "R01" ? 0.5 : 0.3;
  return listed ? Math.min(1, base + 0.35) : base;
}

function contextFor(id: string, s: ScenarioState): ZoneContext {
  const exposure = exposureFor(id, s);
  if (id === "H01") {
    return {
      workload: s.hospital.emergencyWorkload,
      backupHours: s.hospital.backupHours,
      icuOccupancy: s.hospital.icuOccupancy,
      criticalTasks: s.hospital.surgeryActive ? 2 : 0,
      exposure,
    };
  }
  if (id === "W01") {
    return {
      workload: (s.disaster.rainfall >= 7 ? "High" : s.disaster.rainfall >= 4 ? "Medium" : "Low") as Workload,
      backupHours: s.water.backupHours,
      criticalTasks: s.water.criticalTasks,
      exposure,
    };
  }
  if (id === "R01") {
    return { workload: "Medium", backupHours: 10, criticalTasks: 0, exposure };
  }
  return { workload: "Low", backupHours: 12, criticalTasks: 0, exposure };
}

/** Runs the full GRIDSHIELD pipeline for a scenario snapshot. */
export function runPipeline(s: ScenarioState) {
  const scored = Object.values(s.zones).map((zone) => {
    const ctx = contextFor(zone.id, s);
    const { score, factors } = computeDzps(zone, ctx, s.disaster.severity);
    const { predicted, factors: predictionFactors } = predictDemand(zone, ctx, s);
    return {
      ...zone,
      currentDemand: zone.baseDemand,
      predictedDemand: predicted,
      minimumSafePower: round1(predicted * MIN_SAFE_FRACTION[zone.criticality]),
      dzps: score,
      priority: priorityLevel(score),
      factors,
      predictionFactors,
      backupHours: ctx.backupHours,
      icuOccupancy: ctx.icuOccupancy,
      emergencyWorkload: ctx.workload,
      disasterSeverity: s.disaster.severity,
    };
  });

  const supply = computeSupply(s);
  const totalPredicted = round1(scored.reduce((a, z) => a + z.predictedDemand, 0));
  const totalCurrent = round1(scored.reduce((a, z) => a + z.currentDemand, 0));
  const zones = allocate(scored, supply.deliverable);
  const totalAllocated = round1(zones.reduce((a, z) => a + z.allocatedPower, 0));
  const shortfall = round1(totalPredicted - supply.deliverable);

  return { zones, supply, totalPredicted, totalCurrent, totalAllocated, shortfall };
}

const now = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function useGridshield() {
  const [scenario, setScenario] = useState<ScenarioState>(INITIAL_SCENARIO);
  // Applied dispatch starts at the baseline optimum; it only moves when the
  // operator approves / overrides, so pending recommendations stay visible.
  const [applied, setApplied] = useState<Record<string, number>>(() =>
    Object.fromEntries(runPipeline(INITIAL_SCENARIO).zones.map((z) => [z.id, z.allocatedPower])),
  );
  const [log, setLog] = useState<LogEntry[]>([
    { time: now(), kind: "system", message: "GRIDSHIELD initialised — simulated 11 kV substation online." },
  ]);
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected" | "override">("pending");
  const [reassessedAt, setReassessedAt] = useState(() => now());

  const pipeline = useMemo(() => runPipeline(scenario), [scenario]);

  // Applied dispatch = what the simulated grid is actually doing right now.
  const appliedMap = applied;

  const liveZones: ZoneResult[] = useMemo(
    () =>
      pipeline.zones.map((z) => {
        const a = appliedMap[z.id] ?? z.allocatedPower;
        const ratio = z.predictedDemand > 0 ? a / z.predictedDemand : 1;
        return {
          ...z,
          allocatedPower: round1(a),
          reduction: round1(Math.max(0, z.predictedDemand - a)),
          status:
            ratio >= 0.999 ? (z.dzps >= 80 ? "PROTECTED" : "NORMAL") : ratio >= 0.75 ? "REDUCED" : "CURTAILED",
        };
      }),
    [pipeline.zones, appliedMap],
  );

  const telemetry = useMemo(
    () => computeTelemetry(scenario, liveZones.reduce((a, z) => a + z.allocatedPower, 0)),
    [scenario, liveZones],
  );

  const recommendation = useMemo(
    () => buildRecommendation(pipeline.zones, appliedMap, scenario, pipeline.shortfall),
    [pipeline, appliedMap, scenario],
  );

  const addLog = useCallback((message: string, kind: LogEntry["kind"] = "system") => {
    setLog((l) => [{ time: now(), kind, message }, ...l].slice(0, 60));
  }, []);

  /** Any scenario mutation re-runs the whole loop and journals the change. */
  const updateScenario = useCallback(
    (fn: (s: ScenarioState) => ScenarioState, message?: string) => {
      const prev = scenario;
      const next = fn(structuredClone(prev));
      setScenario(next);
      setDecision("pending");
      if (!message) return;
      const before = runPipeline(prev);
      const after = runPipeline(next);
      const entries: LogEntry[] = [{ time: now(), kind: "scenario", message }];
      after.zones.forEach((z) => {
        const b = before.zones.find((x) => x.id === z.id)!;
        if (Math.abs(b.dzps - z.dzps) >= 2)
          entries.push({ time: now(), kind: "system", message: `${z.name} DZPS ${b.dzps} → ${z.dzps}.` });
        if (Math.abs(b.predictedDemand - z.predictedDemand) >= 0.5)
          entries.push({
            time: now(),
            kind: "system",
            message: `${z.name} predicted demand ${b.predictedDemand} → ${z.predictedDemand} MW.`,
          });
      });
      setLog((l) => [...entries.reverse(), ...l].slice(0, 60));
    },
    [scenario],
  );

  const reassess = useCallback(() => {
    setReassessedAt(now());
    setDecision("pending");
    addLog(
      `Reassessment cycle complete — shortfall ${round1(pipeline.shortfall)} MW, recommendation: ${recommendation.headline}.`,
    );
  }, [addLog, pipeline.shortfall, recommendation.headline]);

  const approve = useCallback(() => {
    setApplied(Object.fromEntries(pipeline.zones.map((z) => [z.id, z.allocatedPower])));
    setDecision("approved");
    addLog(`Operator APPROVED: ${recommendation.headline}.`, "operator");
    addLog("Simulated allocation updated at the substation.");
  }, [pipeline.zones, recommendation.headline, addLog]);

  const reject = useCallback(() => {
    setApplied({ ...appliedMap });
    setDecision("rejected");
    addLog(`Operator REJECTED: ${recommendation.headline}. Previous allocation retained.`, "operator");
  }, [appliedMap, recommendation.headline, addLog]);

  const override = useCallback(
    (values: Record<string, number>) => {
      setApplied(values);
      setDecision("override");
      addLog(
        `Operator OVERRIDE — manual dispatch: ${Object.entries(values)
          .map(([id, v]) => `${id} ${round1(v)} MW`)
          .join(", ")}.`,
        "operator",
      );
    },
    [addLog],
  );

  const resetAll = useCallback(() => {
    setScenario(INITIAL_SCENARIO);
    setApplied(Object.fromEntries(runPipeline(INITIAL_SCENARIO).zones.map((z) => [z.id, z.allocatedPower])));
    setDecision("pending");
    addLog("Scenario reset to baseline normal conditions.", "scenario");
  }, [addLog]);

  return {
    scenario,
    updateScenario,
    pipeline,
    liveZones,
    proposedZones: pipeline.zones,
    telemetry,
    recommendation,
    log,
    addLog,
    decision,
    approve,
    reject,
    override,
    reassess,
    reassessedAt,
    resetAll,
  };
}

export type Gridshield = ReturnType<typeof useGridshield>;
