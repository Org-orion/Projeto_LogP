"use client";

import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "destructive" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-status-success/15 text-status-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-status-info/15 text-status-info",
  neutral: "bg-muted text-muted-foreground",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-status-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-status-info",
  neutral: "bg-muted-foreground/50",
};

interface StatusPillProps {
  label: string;
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
}

// Badge de status genérico e reutilizável (não é binário como o das
// máquinas) — usado em Estrutura Industrial, Turnos, Integrações, Backup etc.
export function StatusPill({ label, tone, pulse, className }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT_CLASSES[tone], pulse && "animate-pulse")} />
      {label}
    </span>
  );
}
