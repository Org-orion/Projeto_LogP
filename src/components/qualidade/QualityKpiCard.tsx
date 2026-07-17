"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QualityKpiTone = "primary" | "destructive" | "warning" | "neutral";

const TONE_CLASSES: Record<QualityKpiTone, string> = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

interface QualityKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: QualityKpiTone;
  loading?: boolean;
  trend?: { value: number; isGood: boolean };
  sourceLabel?: string;
}

// KPI card reutilizável nas páginas de Qualidade — mesmo espírito dos cards de
// Gramatura/Recebimento (ícone colorido + valor + rótulo), com tendência
// opcional e um selo discreto indicando se o dado é real ou de exemplo.
export function QualityKpiCard({ icon: Icon, label, value, tone = "primary", loading, trend, sourceLabel }: QualityKpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", TONE_CLASSES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{loading ? "…" : value}</p>
            {trend && !loading && (
              <span className={cn("flex items-center gap-0.5 text-xs font-semibold", trend.isGood ? "text-primary" : "text-destructive")}>
                {trend.isGood ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {sourceLabel && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sourceLabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
