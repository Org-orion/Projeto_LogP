"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SettingsTable, type SettingsTableColumn } from "./SettingsTable";
import { StatusPill } from "./StatusPill";

export interface LogEntry {
  id: string | number;
  dataHora: string;
  usuario: string;
  modulo: string;
  acao: string;
  entidade: string;
  detalhes: string;
  ip: string;
  navegador: string;
  resultado: "sucesso" | "falha";
}

// Tabela de logs somente leitura, com detalhes num drawer lateral (Sheet) —
// reaproveita SettingsTable pra busca/paginação em vez de reimplementar.
export function AuditLogTable({ rows }: { rows: LogEntry[] }) {
  const [selecionado, setSelecionado] = useState<LogEntry | null>(null);

  const columns: SettingsTableColumn<LogEntry>[] = [
    { key: "dataHora", header: "Data e hora", render: (r) => <span className="tabular-nums text-xs">{r.dataHora}</span> },
    { key: "usuario", header: "Usuário", render: (r) => r.usuario },
    { key: "modulo", header: "Módulo", render: (r) => r.modulo, hideOnMobile: true },
    { key: "acao", header: "Ação", render: (r) => r.acao },
    { key: "entidade", header: "Entidade", render: (r) => r.entidade, hideOnMobile: true },
    {
      key: "resultado", header: "Resultado",
      render: (r) => <StatusPill label={r.resultado === "sucesso" ? "Sucesso" : "Falha"} tone={r.resultado === "sucesso" ? "success" : "destructive"} />,
    },
  ];

  return (
    <>
      <SettingsTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar por usuário, módulo ou ação..."
        searchFn={(r, termo) =>
          r.usuario.toLowerCase().includes(termo) ||
          r.modulo.toLowerCase().includes(termo) ||
          r.acao.toLowerCase().includes(termo) ||
          r.entidade.toLowerCase().includes(termo)
        }
        emptyTitle="Nenhum registro de log"
        emptyDescription="Ajuste os filtros ou a busca."
        onRowClick={(row) => setSelecionado(row)}
      />

      <Sheet open={selecionado !== null} onOpenChange={(open) => !open && setSelecionado(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Detalhes do log</SheetTitle>
            <SheetDescription>Registro somente leitura de uma ação no sistema.</SheetDescription>
          </SheetHeader>
          {selecionado && (
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Data e hora", selecionado.dataHora],
                ["Usuário", selecionado.usuario],
                ["Módulo", selecionado.modulo],
                ["Ação", selecionado.acao],
                ["Entidade", selecionado.entidade],
                ["IP", selecionado.ip],
                ["Navegador", selecionado.navegador],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Detalhes</p>
                <p className="rounded-md bg-muted p-3 text-xs leading-relaxed">{selecionado.detalhes}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
