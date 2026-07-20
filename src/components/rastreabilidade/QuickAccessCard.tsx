"use client";

import { PlusCircle, Map as MapIcon, ScanLine, FileBarChart, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAccessCardProps {
  onNovaConsulta: () => void;
  onAbrirMapaPorLote: () => void;
  onAbrirMapaPorAQ: () => void;
  onExportar: () => void;
  exportarDisabled?: boolean;
}

// Itens de atalho — "Relatório de rastreabilidade" fica fora do escopo desta
// etapa (não existe motor de relatório pra esse módulo ainda); os demais são
// funcionais, reaproveitando as mesmas ações já disponíveis na tela.
export function QuickAccessCard({
  onNovaConsulta, onAbrirMapaPorLote, onAbrirMapaPorAQ, onExportar, exportarDisabled,
}: QuickAccessCardProps) {
  const itens = [
    { label: "Nova consulta", icon: PlusCircle, onClick: onNovaConsulta },
    { label: "Mapa de rastreabilidade por lote", icon: MapIcon, onClick: onAbrirMapaPorLote },
    { label: "Mapa de rastreabilidade por AQ", icon: ScanLine, onClick: onAbrirMapaPorAQ },
    { label: "Exportar resultados", icon: Download, onClick: onExportar, disabled: exportarDisabled },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-primary" />
          Acesso rápido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {itens.map(item => (
          <button
            key={item.label}
            onClick={item.onClick}
            disabled={item.disabled}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-left hover:bg-muted/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            {item.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
