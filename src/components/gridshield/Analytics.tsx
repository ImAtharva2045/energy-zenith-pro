import { Panel } from "./primitives";
import type { ZoneResult } from "@/lib/gridshield/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

export function Analytics({
  zones,
  deliverable,
}: {
  zones: ZoneResult[];
  deliverable: number;
}) {
  const short = (n: string) => n.split(" ").slice(-1)[0];
  const data = zones.map((z) => ({
    zone: short(z.name),
    demand: z.currentDemand,
    predicted: z.predictedDemand,
    allocated: z.allocatedPower,
    dzps: z.dzps,
  }));
  const totals = [
    { name: "Deliverable", value: deliverable },
    { name: "Predicted demand", value: Math.round(zones.reduce((a, z) => a + z.predictedDemand, 0) * 10) / 10 },
    { name: "Allocated", value: Math.round(zones.reduce((a, z) => a + z.allocatedPower, 0) * 10) / 10 },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Demand vs Available Power" subtitle="Substation totals (MW)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={totals} margin={{ left: -20 }}>
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {totals.map((t, i) => (
                <Cell key={t.name} fill={["var(--chart-1)", "var(--chart-3)", "var(--chart-2)"][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="DZPS by Zone" subtitle="Dynamic priority score, 0–100">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="zone" {...axis} />
            <YAxis domain={[0, 100]} {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="dzps" radius={[2, 2, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.zone}
                  fill={d.dzps >= 85 ? "var(--crit)" : d.dzps >= 65 ? "var(--warn)" : "var(--chart-1)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Current Allocation by Zone" subtitle="Allocated MW against predicted demand">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="zone" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="predicted" name="Predicted" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="allocated" name="Allocated" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Predicted vs Current Demand" subtitle="Model-demo forecast against baseline load">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="zone" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="demand" name="Current" fill="var(--chart-5)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="predicted" name="Predicted" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
