"use client";

import { AlertTriangle, Boxes, GitBranch, Ghost, ShieldCheck, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/configuracoes/StatusPill";
import { EmptyState } from "@/components/production/EmptyState";
import type { AqFinding, AqFindingTipo } from "./aqGraph";

const TIPO_LABEL: Record<AqFindingTipo, string> = {
  ciclo: "Ciclo detectado",
  componente_conexo: "Bloco interligado",
  origem_inexistente: "Origem inexistente",
  sem_destino: "Sem destino",
  fantasma: "Nó fantasma",
};

const TIPO_TONE: Record<AqFindingTipo, StatusTone> = {
  ciclo: "destructive",
  componente_conexo: "warning",
  origem_inexistente: "destructive",
  sem_destino: "warning",
  fantasma: "neutral",
};

const TIPO_ICON: Record<AqFindingTipo, typeof GitBranch> = {
  ciclo: GitBranch,
  componente_conexo: Boxes,
  origem_inexistente: Unlink,
  sem_destino: AlertTriangle,
  fantasma: Ghost,
};

export interface ValidationFindingsCardProps {
  findings: AqFinding[];
  onDestacar?: (finding: AqFinding) => void;
  className?: string;
}

export function ValidationFindingsCard({ findings, onDestacar, className }: ValidationFindingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Achados da validação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum achado"
            description="Nenhuma inconsistência estrutural encontrada no grafo de AQs."
          />
        ) : (
          <ul className="space-y-3">
            {findings.map(finding => {
              const Icon = TIPO_ICON[finding.tipo];
              return (
                <li key={finding.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <StatusPill label={TIPO_LABEL[finding.tipo]} tone={TIPO_TONE[finding.tipo]} />
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-2">{finding.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{finding.descricao}</p>
                  {onDestacar && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => onDestacar(finding)}
                    >
                      Destacar no mapa
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
