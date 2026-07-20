"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtData, type LoteGroup } from "./aqSearch";

export interface CadeiaCardNodeData extends Record<string, unknown> {
  group: LoteGroup;
  nomeAQ: string | null;
  peca: string;
  pecaSuspeita: boolean;
  onAbrirDetalhes: (group: LoteGroup) => void;
}

export function CadeiaCardNode({ data }: NodeProps & { data: CadeiaCardNodeData }) {
  const { group, nomeAQ, peca, pecaSuspeita, onAbrirDetalhes } = data;
  return (
    <button
      onClick={() => onAbrirDetalhes(group)}
      className="w-[200px] text-left rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/50 hover:bg-muted/20 transition-colors"
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground/40 !border-0 !w-1.5 !h-1.5" />
      <div className="flex items-center gap-1.5 min-w-0">
        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{group.currentAQ ?? "—"}</Badge>
        {nomeAQ && <span className="text-xs font-semibold truncate" title={nomeAQ}>{nomeAQ}</span>}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Lote</p>
      <p className="text-xs font-medium font-mono flex items-center gap-1">
        {peca}
        {pecaSuspeita && (
          <span title="Peça com menos dígitos que as demais do mesmo lote — possível erro de digitação, sem rastreamento automático">
            <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
          </span>
        )}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1.5">Fabricado em</p>
      <p className="text-xs font-medium font-mono">{fmtData(group.ultimaData)}</p>
      <p className="text-[10px] text-muted-foreground mt-1.5">Quantidade</p>
      <p className="text-xs font-medium font-mono">{group.totalConf}</p>
      <p className="text-[10px] text-muted-foreground mt-1.5">Produto</p>
      <p className="text-xs font-medium truncate" title={group.produto ?? undefined}>{group.produto ?? "—"}</p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground/40 !border-0 !w-1.5 !h-1.5" />
    </button>
  );
}
