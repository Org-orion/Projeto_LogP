"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Factory } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MachineRow } from "./MachineRow";
import { EmptyState } from "./EmptyState";
import type { Maquina } from "./types";

export type MachineSortKey = "nome" | "producao" | "tendencia" | "status";
export type SortDir = "asc" | "desc";

export interface MachineTableRow {
  maquina: Maquina;
  producaoTotal: number;
  participacaoPct: number;
  sparklineData: { value: number }[];
  deltaPct: number | null;
}

interface MachineTableProps {
  rows: MachineTableRow[];
  sortBy: MachineSortKey;
  sortDir: SortDir;
  onSort: (key: MachineSortKey) => void;
  onRowClick: (m: Maquina) => void;
  onEdit: (m: Maquina) => void;
  getLancarAction: (m: Maquina) => (() => void) | undefined;
  canEdit: boolean;
}

function SortHeader({
  label, sortKey, sortBy, sortDir, onSort, align = "left",
}: {
  label: string; sortKey: MachineSortKey; sortBy: MachineSortKey; sortDir: SortDir;
  onSort: (key: MachineSortKey) => void; align?: "left" | "right";
}) {
  const active = sortBy === sortKey;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${active ? "font-semibold text-foreground" : ""}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </TableHead>
  );
}

export function MachineTable({ rows, sortBy, sortDir, onSort, onRowClick, onEdit, getLancarAction, canEdit }: MachineTableProps) {
  if (rows.length === 0) {
    return <EmptyState icon={Factory} title="Nenhuma máquina encontrada" description="Ajuste os filtros ou a busca." />;
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHeader label="Máquina" sortKey="nome" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Produção" sortKey="producao" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
            <TableHead className="hidden md:table-cell text-right">Participação</TableHead>
            <SortHeader label="Tendência" sortKey="tendencia" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <MachineRow
              key={r.maquina.id}
              maquina={r.maquina}
              producaoTotal={r.producaoTotal}
              participacaoPct={r.participacaoPct}
              sparklineData={r.sparklineData}
              deltaPct={r.deltaPct}
              onClick={() => onRowClick(r.maquina)}
              onView={onRowClick}
              onEdit={onEdit}
              onLancar={getLancarAction(r.maquina)}
              canEdit={canEdit}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
