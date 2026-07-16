"use client";

import { Eye, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsTable, type SettingsTableColumn } from "./SettingsTable";
import { StatusPill, type StatusTone } from "./StatusPill";

export interface BackupEntry {
  id: string | number;
  data: string;
  tamanho: string;
  destino: string;
  duracao: string;
  status: "sucesso" | "falha" | "em_andamento";
  responsavel: string;
}

const STATUS_LABEL: Record<BackupEntry["status"], string> = { sucesso: "Sucesso", falha: "Falha", em_andamento: "Em andamento" };
const STATUS_TONE: Record<BackupEntry["status"], StatusTone> = { sucesso: "success", falha: "destructive", em_andamento: "info" };

interface BackupHistoryTableProps {
  rows: BackupEntry[];
  canDownload: boolean;
  canRestore: boolean;
  onVisualizar: (row: BackupEntry) => void;
  onBaixar: (row: BackupEntry) => void;
  onRestaurar: (row: BackupEntry) => void;
}

export function BackupHistoryTable({ rows, canDownload, canRestore, onVisualizar, onBaixar, onRestaurar }: BackupHistoryTableProps) {
  const columns: SettingsTableColumn<BackupEntry>[] = [
    { key: "data", header: "Data", render: (r) => <span className="tabular-nums text-xs">{r.data}</span> },
    { key: "tamanho", header: "Tamanho", render: (r) => r.tamanho },
    { key: "destino", header: "Destino", render: (r) => r.destino, hideOnMobile: true },
    { key: "duracao", header: "Duração", render: (r) => r.duracao, hideOnMobile: true },
    { key: "status", header: "Status", render: (r) => <StatusPill label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} pulse={r.status === "em_andamento"} /> },
    { key: "responsavel", header: "Responsável", render: (r) => r.responsavel, hideOnMobile: true },
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Visualizar detalhes" onClick={() => onVisualizar(r)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canDownload && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Baixar" onClick={() => onBaixar(r)} disabled={r.status !== "sucesso"}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {canRestore && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Restaurar" onClick={() => onRestaurar(r)} disabled={r.status !== "sucesso"}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      emptyTitle="Nenhum backup registrado"
      emptyDescription="Execute um backup pra ver o histórico aqui."
    />
  );
}
