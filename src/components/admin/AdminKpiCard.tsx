"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminKpiTone = "primary" | "destructive" | "warning" | "neutral";

const TONE_CLASSES: Record<AdminKpiTone, string> = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

interface AdminKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: AdminKpiTone;
  loading?: boolean;
  trend?: { value: number; isGood: boolean };
  tooltip?: string;
}

// KPI card do módulo Administração — ícone colorido + valor + rótulo, com
// tendência e tooltip opcionais. Mesmo espírito visual do QualityKpiCard.
export function AdminKpiCard({ icon: Icon, label, value, tone = "primary", loading, trend, tooltip }: AdminKpiCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md" title={tooltip}>
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
        </div>
      </CardContent>
    </Card>
  );
}
