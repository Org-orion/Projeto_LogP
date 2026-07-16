"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Sparkline, type TrendDirection } from "./Sparkline";
import { TrendBadge } from "./TrendBadge";
import { MachineActions } from "./MachineActions";
import type { Maquina } from "./types";

interface MachineRowProps {
  maquina: Maquina;
  producaoTotal: number;
  participacaoPct: number;
  sparklineData: { value: number }[];
  deltaPct: number | null;
  onClick: () => void;
  onView: (m: Maquina) => void;
  onEdit: (m: Maquina) => void;
  onLancar?: (() => void) | null;
  canEdit: boolean;
}

export function MachineRow({
  maquina, producaoTotal, participacaoPct, sparklineData, deltaPct,
  onClick, onView, onEdit, onLancar, canEdit,
}: MachineRowProps) {
  const nome = (maquina.nome as string) || `Máquina ${maquina.id}`;
  const trend: TrendDirection = !deltaPct ? "flat" : deltaPct > 0 ? "up" : "down";

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="font-medium">{nome}</TableCell>
      <TableCell><StatusBadge status={maquina.status as string | undefined} /></TableCell>
      <TableCell className="text-right tabular-nums">{producaoTotal.toLocaleString("pt-BR")}</TableCell>
      <TableCell className="hidden md:table-cell text-right text-muted-foreground tabular-nums">
        {participacaoPct.toFixed(1)}%
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Sparkline data={sparklineData} trend={trend} />
          <TrendBadge delta={deltaPct} />
        </div>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <MachineActions maquina={maquina} canEdit={canEdit} onView={onView} onEdit={onEdit} onLancar={onLancar} />
      </TableCell>
    </TableRow>
  );
}
