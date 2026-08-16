import { createFileRoute } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useGridshield } from "@/lib/gridshield/store";
import { Panel, Tag, gridTone } from "@/components/gridshield/primitives";
import { ScenarioControls } from "@/components/gridshield/ScenarioControls";
import { ZoneTable } from "@/components/gridshield/ZoneTable";
import { RecommendationPanel } from "@/components/gridshield/RecommendationPanel";
import { GridSchematic } from "@/components/gridshield/GridSchematic";
import { PredictionPanel } from "@/components/gridshield/PredictionPanel";
import { Analytics } from "@/components/gridshield/Analytics";
import { ActivityLog } from "@/components/gridshield/ActivityLog";
import { RotateCcw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GRIDSHIELD — Intelligent Power Allocation & Grid Resilience" },
      {
        name: "description",
        content:
          "GRIDSHIELD Phase-1 prototype: dynamic zone priority scoring, disaster-aware demand prediction and constraint-aware power allocation on a simulated 11 kV substation.",
      },
      { property: "og:title", content: "GRIDSHIELD — Intelligent Power Allocation & Grid Resilience" },
      {
        property: "og:description",
        content:
          "Decision-support prototype for dynamic power allocation during urban disasters. Simulated substation data, explainable recommendations, operator approval loop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Metric({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="panel rounded-sm px-4 py-3">
      <div className="label-caps">{label}</div>
      <div className={`metric mt-1 text-2xl font-semibold ${tone ?? "text-foreground"}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function Dashboard() {
  const gs = useGridshield();
  const { pipeline, liveZones, telemetry, scenario } = gs;
  const shortfall = Math.round((pipeline.totalPredicted - pipeline.supply.deliverable) * 10) / 10;
  const criticalZones = liveZones.filter((z) => z.priority === "CRITICAL").length;
  const health =
    telemetry.status === "CRITICAL" || shortfall > 15 ? "CRITICAL" : shortfall > 0 || telemetry.status === "WARNING" ? "WARNING" : "NORMAL";

  return (
    <TooltipProvider delayDuration={150}>
      <main className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold tracking-[0.14em] text-foreground">GRIDSHIELD</h1>
                <p className="text-xs text-muted-foreground">Intelligent Power Allocation &amp; Grid Resilience</p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Tag tone={gridTone(health as "NORMAL")}>● {health}</Tag>
              <Tag tone="warn">PHASE-1 PROTOTYPE • SIMULATED DATA</Tag>
              <Button size="sm" variant="ghost" onClick={gs.resetAll} className="gap-1.5 text-xs">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Available Power" value={String(pipeline.supply.deliverable)} unit="MW" />
            <Metric label="Predicted Total Demand" value={String(pipeline.totalPredicted)} unit="MW" />
            <Metric
              label={shortfall > 0 ? "Power Shortage" : "Power Surplus"}
              value={String(Math.abs(shortfall))}
              unit="MW"
              tone={shortfall > 0 ? "text-crit" : "text-ok"}
            />
            <Metric label="Critical Zones" value={`${criticalZones} / ${liveZones.length}`} />
            <Metric
              label="Grid Health"
              value={health}
              tone={health === "NORMAL" ? "text-ok" : health === "WARNING" ? "text-warn" : "text-crit"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className="space-y-4">
              <ScenarioControls gs={gs} />
            </div>

            <div className="space-y-4">
              <RecommendationPanel gs={gs} />

              <Tabs defaultValue="allocation">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="allocation">Allocation</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="forecast">Forecast</TabsTrigger>
                  <TabsTrigger value="log">Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="allocation" className="mt-4 space-y-4">
                  <ZoneTable zones={liveZones} />
                  <Analytics zones={liveZones} deliverable={pipeline.supply.deliverable} />
                </TabsContent>

                <TabsContent value="grid" className="mt-4">
                  <GridSchematic zones={liveZones} telemetry={telemetry} supply={pipeline.supply} />
                </TabsContent>

                <TabsContent value="forecast" className="mt-4">
                  <PredictionPanel zones={liveZones} />
                </TabsContent>

                <TabsContent value="log" className="mt-4">
                  <ActivityLog log={gs.log} />
                </TabsContent>
              </Tabs>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Phase-1 Proof of Concept — simulated {scenario.grid.feederCapacity} MW / 11 kV substation, facility and
                disaster data. Scoring, allocation and the operator loop are real logic; no connection to live SCADA,
                hospital or utility systems.
              </p>
            </div>
          </div>
        </div>

      </main>
    </TooltipProvider>
  );
}
