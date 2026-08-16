import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Panel } from "./primitives";
import type { Gridshield } from "@/lib/gridshield/store";
import type { Workload } from "@/lib/gridshield/types";
import { cn } from "@/lib/utils";

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="label-caps">{label}</span>
        <span className="metric text-xs text-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

const WORKLOADS: Workload[] = ["Low", "Medium", "High"];

export function ScenarioControls({ gs }: { gs: Gridshield }) {
  const { scenario: s, updateScenario } = gs;

  const quick = (label: string, fn: Parameters<Gridshield["updateScenario"]>[0], msg: string) => (
    <Button
      key={label}
      variant="outline"
      size="sm"
      className="justify-start border-border bg-secondary/50 text-xs font-semibold tracking-wide hover:bg-accent"
      onClick={() => updateScenario(fn, msg)}
    >
      {label}
    </Button>
  );

  return (
    <Panel title="Scenario Controls" subtitle="Operator-editable simulated inputs">
      <div className="grid gap-2 sm:grid-cols-2">
        {quick("NORMAL CONDITIONS", (d) => {
          d.disaster = { type: "Urban Flood", severity: 1, rainfall: 1, affectedZones: [] };
          d.hospital = { icuOccupancy: 70, emergencyWorkload: "Medium", surgeryActive: false, backupHours: 4 };
          d.water = { backupHours: 5, criticalTasks: 1 };
          d.energy = { ...d.energy, gridPower: 88, solarGeneration: 8, batterySoc: 80 };
          return d;
        }, "Scenario set to NORMAL CONDITIONS.")}
        {quick("TRIGGER FLOOD", (d) => {
          d.disaster = { type: "Urban Flood", severity: 8, rainfall: 9, affectedZones: ["H01", "W01", "R01"] };
          d.hospital.emergencyWorkload = "High";
          d.hospital.icuOccupancy = Math.max(d.hospital.icuOccupancy, 88);
          d.water.criticalTasks = 3;
          d.energy.gridPower = 62;
          d.energy.solarGeneration = 2;
          return d;
        }, "FLOOD triggered — severity 8/10, rainfall 9/10, grid import reduced to 62 MW.")}
        {quick("HOSPITAL EMERGENCY", (d) => {
          d.hospital.emergencyWorkload = "High";
          d.hospital.icuOccupancy = 95;
          d.hospital.surgeryActive = true;
          return d;
        }, "Hospital mass-casualty emergency declared — ICU 95%, surgery active.")}
        {quick("BACKUP CRITICAL", (d) => {
          d.hospital.backupHours = 1;
          d.water.backupHours = 0.5;
          return d;
        }, "Backup autonomy critical — hospital 1 h, water plant 0.5 h remaining.")}
        {quick("SURGERY COMPLETED", (d) => {
          d.hospital.surgeryActive = false;
          d.hospital.emergencyWorkload = "Medium";
          d.hospital.icuOccupancy = Math.max(55, d.hospital.icuOccupancy - 20);
          return d;
        }, "Surgery completed — hospital workload and ICU occupancy reduced.")}
        {quick("RESTORE NORMAL", (d) => {
          d.disaster = { type: "Urban Flood", severity: 0, rainfall: 0, affectedZones: [] };
          d.hospital = { icuOccupancy: 60, emergencyWorkload: "Low", surgeryActive: false, backupHours: 8 };
          d.water = { backupHours: 8, criticalTasks: 0 };
          d.energy = { ...d.energy, gridPower: 100, solarGeneration: 10, batterySoc: 95 };
          return d;
        }, "Conditions restored to normal — full grid import available.")}
      </div>

      <div className="mt-5 space-y-5">
        <div className="space-y-3">
          <h3 className="label-caps text-foreground">Disaster</h3>
          <Field label="Flood severity" value={`${s.disaster.severity}/10`}>
            <Slider
              value={[s.disaster.severity]}
              max={10}
              step={1}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.disaster.severity = v ?? 0), d), `Flood severity set to ${v}/10.`)
              }
            />
          </Field>
          <Field label="Rainfall intensity" value={`${s.disaster.rainfall}/10`}>
            <Slider
              value={[s.disaster.rainfall]}
              max={10}
              step={1}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.disaster.rainfall = v ?? 0), d), `Rainfall intensity set to ${v}/10.`)
              }
            />
          </Field>
          <div>
            <span className="label-caps">Affected zones</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.values(s.zones).map((z) => {
                const on = s.disaster.affectedZones.includes(z.id);
                return (
                  <button
                    key={z.id}
                    onClick={() =>
                      updateScenario(
                        (d) => {
                          d.disaster.affectedZones = on
                            ? d.disaster.affectedZones.filter((x) => x !== z.id)
                            : [...d.disaster.affectedZones, z.id];
                          return d;
                        },
                        `${z.name} ${on ? "cleared from" : "marked as"} disaster-affected.`,
                      )
                    }
                    className={cn(
                      "metric rounded-xs border px-2 py-1 text-[11px] transition-colors",
                      on ? "border-crit/50 bg-crit/15 text-crit" : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {z.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="label-caps text-foreground">Hospital H01</h3>
          <Field label="ICU occupancy" value={`${s.hospital.icuOccupancy}%`}>
            <Slider
              value={[s.hospital.icuOccupancy]}
              max={100}
              step={5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.hospital.icuOccupancy = v ?? 0), d), `ICU occupancy set to ${v}%.`)
              }
            />
          </Field>
          <div>
            <span className="label-caps">Emergency workload</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {WORKLOADS.map((w) => (
                <button
                  key={w}
                  onClick={() =>
                    updateScenario((d) => ((d.hospital.emergencyWorkload = w), d), `Hospital emergency workload set to ${w}.`)
                  }
                  className={cn(
                    "rounded-xs border px-2 py-1 text-xs font-semibold transition-colors",
                    s.hospital.emergencyWorkload === w
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="label-caps">Surgery in progress</span>
            <Switch
              checked={s.hospital.surgeryActive}
              onCheckedChange={(v) =>
                updateScenario((d) => ((d.hospital.surgeryActive = v), d), `Surgery ${v ? "started" : "completed"}.`)
              }
            />
          </div>
          <Field label="Backup remaining" value={`${s.hospital.backupHours} h`}>
            <Slider
              value={[s.hospital.backupHours]}
              max={24}
              step={0.5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.hospital.backupHours = v ?? 0), d), `Hospital backup autonomy set to ${v} h.`)
              }
            />
          </Field>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="label-caps text-foreground">Water Plant W01</h3>
          <Field label="Backup remaining" value={`${s.water.backupHours} h`}>
            <Slider
              value={[s.water.backupHours]}
              max={24}
              step={0.5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.water.backupHours = v ?? 0), d), `Water plant backup autonomy set to ${v} h.`)
              }
            />
          </Field>
          <Field label="Active critical tasks" value={`${s.water.criticalTasks}`}>
            <Slider
              value={[s.water.criticalTasks]}
              max={4}
              step={1}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.water.criticalTasks = v ?? 0), d), `Water plant critical tasks set to ${v}.`)
              }
            />
          </Field>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="label-caps text-foreground">Energy Resources</h3>
          <Field label="Available grid power" value={`${s.energy.gridPower} MW`}>
            <Slider
              value={[s.energy.gridPower]}
              max={120}
              step={1}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.energy.gridPower = v ?? 0), d), `Grid import set to ${v} MW.`)
              }
            />
          </Field>
          <Field label="Solar generation" value={`${s.energy.solarGeneration} MW`}>
            <Slider
              value={[s.energy.solarGeneration]}
              max={25}
              step={1}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.energy.solarGeneration = v ?? 0), d), `Solar generation set to ${v} MW.`)
              }
            />
          </Field>
          <Field label="Battery state of charge" value={`${s.energy.batterySoc}%`}>
            <Slider
              value={[s.energy.batterySoc]}
              max={100}
              step={5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.energy.batterySoc = v ?? 0), d), `Battery state of charge set to ${v}%.`)
              }
            />
          </Field>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="label-caps text-foreground">Network Constraints</h3>
          <Field label="Feeder capacity" value={`${s.grid.feederCapacity} MW`}>
            <Slider
              value={[s.grid.feederCapacity]}
              min={40}
              max={140}
              step={5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.grid.feederCapacity = v ?? 0), d), `Feeder capacity set to ${v} MW.`)
              }
            />
          </Field>
          <Field label="Transformer capacity" value={`${s.grid.transformerCapacity} MW`}>
            <Slider
              value={[s.grid.transformerCapacity]}
              min={40}
              max={140}
              step={5}
              onValueChange={([v]) =>
                updateScenario((d) => ((d.grid.transformerCapacity = v ?? 0), d), `Transformer capacity set to ${v} MW.`)
              }
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}
