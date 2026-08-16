// GRIDSHIELD — Phase-1 prototype data model (all values SIMULATED / SYNTHETIC)

export type Criticality = "Very High" | "High" | "Medium" | "Low";
export type Workload = "Low" | "Medium" | "High";
export type Flexibility = "Low" | "Medium" | "High";
export type ZoneType = "Hospital" | "Water Treatment" | "Residential" | "Commercial";
export type AllocationStatus = "PROTECTED" | "NORMAL" | "REDUCED" | "CURTAILED";
export type GridStatus = "NORMAL" | "WARNING" | "CRITICAL";
export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Operator-editable scenario inputs. Everything downstream is derived from these. */
export interface ScenarioState {
  disaster: {
    type: string;
    severity: number; // 0-10
    rainfall: number; // 0-10
    affectedZones: string[];
  };
  hospital: {
    icuOccupancy: number; // 0-100 %
    emergencyWorkload: Workload;
    surgeryActive: boolean;
    backupHours: number; // 0-24
  };
  water: {
    backupHours: number;
    criticalTasks: number; // active critical pumping tasks
  };
  energy: {
    gridPower: number; // MW from the upstream grid
    solarGeneration: number; // MW
    batterySoc: number; // 0-100 %
    batteryCapacityMWh: number;
  };
  grid: {
    feederCapacity: number; // MW
    transformerCapacity: number; // MW
  };
  zones: Record<string, ZoneInput>;
}

export interface ZoneInput {
  id: string;
  name: string;
  type: ZoneType;
  criticality: Criticality;
  flexibility: Flexibility;
  baseDemand: number; // MW
}

export interface ScoreFactor {
  label: string;
  detail: string;
  contribution: number; // points added to the 0-100 DZPS
}

export interface PredictionFactor {
  label: string;
  deltaMw: number;
}

export interface ZoneResult extends ZoneInput {
  currentDemand: number;
  predictedDemand: number;
  minimumSafePower: number;
  dzps: number;
  priority: PriorityLevel;
  factors: ScoreFactor[];
  predictionFactors: PredictionFactor[];
  backupHours: number;
  icuOccupancy?: number | undefined;
  emergencyWorkload?: Workload | undefined;
  disasterSeverity: number;
  allocatedPower: number;
  reduction: number;
  status: AllocationStatus;
}

export interface GridTelemetry {
  voltageKv: number;
  currentA: number;
  frequencyHz: number;
  feederLoadingPct: number;
  transformerLoadingPct: number;
  status: GridStatus;
}

export interface Recommendation {
  headline: string;
  explanation: string;
  affectedZones: { id: string; name: string; deltaMw: number }[];
  priorityFactors: string[];
  shortfall: number;
  hasChange: boolean;
}

export interface LogEntry {
  time: string;
  kind: "system" | "operator" | "scenario";
  message: string;
}
