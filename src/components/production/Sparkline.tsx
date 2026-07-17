"use client";

import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export type TrendDirection = "up" | "down" | "flat";

interface SparklineProps {
  data: { value: number }[];
  trend: TrendDirection;
  width?: number;
  height?: number;
}

const TREND_COLOR: Record<TrendDirection, string> = {
  up: "hsl(var(--status-success))",
  down: "hsl(var(--destructive))",
  flat: "hsl(var(--muted-foreground))",
};

// Mini tendência reutilizável (tabela de máquinas). Mesmo padrão visual do
// sparkline já usado em MetricCard, só que como componente próprio pra caber
// numa célula de tabela.
export function Sparkline({ data, trend, width = 72, height = 28 }: SparklineProps) {
  const gradId = `sparkline-fill-${useId()}`;

  if (data.length < 2) {
    return (
      <span style={{ width, height }} className="inline-flex items-center text-xs text-muted-foreground">—</span>
    );
  }

  const color = TREND_COLOR[trend];
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
