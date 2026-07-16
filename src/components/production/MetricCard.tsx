"use client";

import type { LucideIcon } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendBadge } from "./TrendBadge";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  tone?: "primary" | "neutral";
  className?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number | null;
  trendInvert?: boolean;
  sparkline?: { value: number }[];
  progress?: number;
  /** Card de KPI mais denso (ícone/tendência/sparkline/progresso), usado na Visão Geral. Segue os tokens normais do tema (claro/escuro), sem paleta fixa. */
  dark?: boolean;
}

export function MetricCard({
  label, value, hint, loading, tone = "primary", className,
  icon: Icon, iconColor, trend, trendInvert, sparkline, progress, dark,
}: MetricCardProps) {
  if (dark) {
    const accent = iconColor ?? "hsl(var(--primary))";
    return (
      <div className={cn("bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm transition-colors", className)}>
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
            >
              <Icon size={16} style={{ color: accent }} />
            </div>
          )}
        </div>

        <p className="font-bold leading-none text-foreground" style={{ fontSize: 32 }}>
          {loading ? "…" : value}
        </p>

        <div className="flex items-center gap-2 mt-2 min-h-[18px]">
          {trend !== undefined && <TrendBadge delta={loading ? null : trend} invert={trendInvert} />}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>

        {progress !== undefined && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            />
          </div>
        )}

        {sparkline && sparkline.length > 1 && (
          <div className="h-8 -mx-1 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metric-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  fill="url(#metric-spark-fill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("shrink-0", tone === "primary" && "border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-4">
        <p className={cn("text-xs font-medium", tone === "primary" ? "text-primary/80" : "text-muted-foreground")}>
          {label}
        </p>
        <p className={cn("text-3xl font-bold leading-none mt-1", tone === "primary" ? "text-primary" : "text-foreground")}>
          {loading ? "…" : value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
