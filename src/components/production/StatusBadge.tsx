"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Único status real hoje é binário (ativa vs. qualquer outra coisa) — não
// inventar Parada/Setup/Manutenção/Offline sem dado de verdade por trás.
export function isMaquinaAtiva(status?: string | null): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s === "ativa" || s === "ativo" || s === "active";
}

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const ativa = isMaquinaAtiva(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border-transparent whitespace-nowrap",
        ativa ? "bg-status-success/15 text-status-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ativa ? "bg-status-success animate-pulse" : "bg-muted-foreground/50")} />
      {ativa ? "Ativa" : "Inativa"}
    </Badge>
  );
}
