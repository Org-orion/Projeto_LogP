"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";

export interface AuditLogRow {
  id: number;
  created_at: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  acao: string;
  modulo: string;
  entidade: string | null;
  descricao: string;
  ip: string | null;
  user_agent: string | null;
  resultado: "sucesso" | "falha";
}

interface AuditTableProps {
  rows: AuditLogRow[];
  onRowClick: (row: AuditLogRow) => void;
}

export function AuditTable({ rows, onRowClick }: AuditTableProps) {
  const columns: SettingsTableColumn<AuditLogRow>[] = [
    { key: "data", header: "Data", render: (r) => <span className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</span> },
    { key: "usuario", header: "Usuário", render: (r) => <span className="text-xs font-medium">{r.usuario_nome ?? "—"}</span> },
    { key: "acao", header: "Ação", render: (r) => <span className="text-xs">{r.acao}</span> },
    { key: "modulo", header: "Módulo", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.modulo}</span> },
    { key: "descricao", header: "Descrição", hideOnMobile: true, render: (r) => <span className="text-xs max-w-72 truncate block">{r.descricao}</span> },
    { key: "resultado", header: "Resultado", render: (r) => (
      <Badge variant="outline" className={r.resultado === "sucesso" ? "text-xs border-primary/30 text-primary bg-primary/5" : "text-xs border-destructive/30 text-destructive bg-destructive/5"}>
        {r.resultado === "sucesso" ? "Sucesso" : "Falha"}
      </Badge>
    ) },
  ];

  return (
    <SettingsTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Buscar por usuário ou descrição..."
      searchFn={(r, term) => (r.usuario_nome ?? "").toLowerCase().includes(term) || r.descricao.toLowerCase().includes(term)}
      emptyTitle="Nenhum evento de auditoria"
      onRowClick={onRowClick}
    />
  );
}
