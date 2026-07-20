"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Package, Hammer, Factory, Layers, Truck, HelpCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubprocessoKey } from "./aqConfig";

export interface AqNodeData extends Record<string, unknown> {
  aqId: string;
  nome: string;
  subprocesso: SubprocessoKey | null;
  /** Faz parte do caminho percorrido pelo lote pesquisado (aba Lote). */
  emCaminho: boolean;
  /** Existe algum realce ativo (caminho de lote OU achado focado) e este nó não faz parte dele. */
  esmaecido: boolean;
  /** Nó envolvido no achado de validação atualmente focado. */
  emAchado: boolean;
}

const SUBPROCESSO_ICON: Record<SubprocessoKey, LucideIcon> = {
  materia_prima: Package,
  porta: Hammer,
  quadro: Layers,
  perfis: Layers,
  acabamento: Factory,
  expedicao: Truck,
};

const SUBPROCESSO_TONE: Record<SubprocessoKey, string> = {
  materia_prima: "bg-status-info/15 text-status-info border-status-info/30",
  porta: "bg-status-success/15 text-status-success border-status-success/30",
  quadro: "bg-primary/10 text-primary border-primary/30",
  perfis: "bg-primary/10 text-primary border-primary/30",
  acabamento: "bg-warning/15 text-warning border-warning/30",
  expedicao: "bg-primary text-primary-foreground border-primary",
};

const FANTASMA_TONE = "bg-muted text-muted-foreground border-border border-dashed";

export function AqNode({ data }: NodeProps & { data: AqNodeData }) {
  const { aqId, nome, subprocesso, emCaminho, esmaecido, emAchado } = data;
  const Icon = subprocesso ? SUBPROCESSO_ICON[subprocesso] : HelpCircle;
  const tone = subprocesso ? SUBPROCESSO_TONE[subprocesso] : FANTASMA_TONE;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm transition-opacity min-w-[168px]",
        tone,
        emCaminho && "ring-2 ring-offset-1 ring-offset-background ring-status-success",
        emAchado && "ring-2 ring-offset-1 ring-offset-background ring-destructive",
        esmaecido && !emCaminho && !emAchado && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground/40 !border-0 !w-1.5 !h-1.5" />
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] font-mono font-semibold leading-none">{aqId}</div>
        <div className="text-[10px] leading-tight truncate mt-0.5 opacity-90">{nome}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground/40 !border-0 !w-1.5 !h-1.5" />
    </div>
  );
}
