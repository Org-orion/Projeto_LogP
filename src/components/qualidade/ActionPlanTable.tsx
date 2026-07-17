"use client";

import { format } from "date-fns";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { QualityStatusBadge } from "@/components/qualidade/QualityStatusBadge";

export type Metodologia = "5w2h" | "5-porques" | "ishikawa" | "8d" | "capa" | "simples";
export type PlanoStatus = "planejado" | "em_andamento" | "concluido" | "atrasado" | "cancelado";
export type Eficacia = "nao_avaliada" | "eficaz" | "ineficaz";

export interface AcaoItem {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: "pendente" | "em_andamento" | "concluido";
}

export interface PlanoAcao {
  id: string;
  numero: string;
  titulo: string;
  origem: string;
  metodologia: Metodologia;
  responsavel: string;
  progresso: number;
  prazo: string; // ISO date
  status: PlanoStatus;
  itens: AcaoItem[];
  criterioEficacia: string;
  eficacia: Eficacia;
  dataVerificacaoEficacia: string;
  avaliador: string;
}

export const METODOLOGIA_LABELS: Record<Metodologia, string> = {
  "5w2h": "5W2H",
  "5-porques": "5 Porquês",
  ishikawa: "Ishikawa",
  "8d": "8D",
  capa: "CAPA",
  simples: "Ação Simples",
};

interface ActionPlanTableProps {
  rows: PlanoAcao[];
  onView: (row: PlanoAcao) => void;
  onEdit: (row: PlanoAcao) => void;
  onDelete: (row: PlanoAcao) => void;
}

export function ActionPlanTable({ rows, onView, onEdit, onDelete }: ActionPlanTableProps) {
  const columns: SettingsTableColumn<PlanoAcao>[] = [
    { key: "numero", header: "Nº", render: (r) => <span className="font-semibold text-xs">{r.numero}</span> },
    { key: "titulo", header: "Título / Origem", render: (r) => (
      <div className="text-xs max-w-56">
        <div className="font-medium truncate">{r.titulo}</div>
        <div className="text-muted-foreground truncate">{r.origem}</div>
      </div>
    ) },
    { key: "metodologia", header: "Metodologia", hideOnMobile: true, render: (r) => <span className="text-xs">{METODOLOGIA_LABELS[r.metodologia]}</span> },
    { key: "progresso", header: "Progresso", render: (r) => (
      <div className="flex items-center gap-2 w-28">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${r.progresso}%` }} />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right">{r.progresso}%</span>
      </div>
    ) },
    { key: "prazo", header: "Prazo", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.prazo), "dd/MM/yyyy")}</span> },
    { key: "status", header: "Status", render: (r) => <QualityStatusBadge kind="plano" status={r.status} /> },
    { key: "acoes", header: "", render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(r)}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ];

  return (
    <SettingsTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Buscar por número ou título..."
      searchFn={(r, term) => r.numero.toLowerCase().includes(term) || r.titulo.toLowerCase().includes(term)}
      emptyTitle="Nenhum plano de ação registrado"
      emptyDescription="Clique em “Novo Plano” para começar."
    />
  );
}
