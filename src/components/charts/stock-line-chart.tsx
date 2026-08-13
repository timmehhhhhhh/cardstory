"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils/format";
import type { SupportedCurrency } from "@/lib/constants";

export interface ChartPoint {
  date: string;
  value: number | null;
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  currency: SupportedCurrency;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{p.date}</p>
      <p className="num-tabular font-semibold text-foreground">{formatMoney(p.value, currency)}</p>
    </div>
  );
}

export function StockLineChart({
  points,
  currency = "USD",
  height = 220,
}: {
  points: ChartPoint[];
  currency?: SupportedCurrency;
  height?: number;
}) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const positive = values.length >= 2 ? values[values.length - 1] >= values[0] : true;
  const color = positive ? "var(--positive)" : "var(--negative)";
  const gradientId = `chart-fill-${positive ? "up" : "down"}`;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
