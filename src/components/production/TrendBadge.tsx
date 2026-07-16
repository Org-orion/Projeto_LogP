"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendBadgeProps {
  delta: number | null;
  invert?: boolean;
}

// ▲ +12% / ▼ -4% — indicador de tendência reutilizado nos KPIs do dashboard.
export function TrendBadge({ delta, invert = false }: TrendBadgeProps) {
  if (delta === null || !isFinite(delta)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus size={12} /> sem histórico
      </span>
    );
  }

  const isUp = delta > 0;
  const isFlat = delta === 0;
  const good = isFlat ? null : (isUp !== invert);
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isFlat ? "text-muted-foreground" : good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon size={12} />
      {isUp ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}
