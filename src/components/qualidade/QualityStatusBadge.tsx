"use client";

import { StatusPill, type StatusTone } from "@/components/configuracoes/StatusPill";

export type QualityStatusKind = "inspecao" | "plano" | "lote" | "conformidade";

const PRESETS: Record<QualityStatusKind, Record<string, { label: string; tone: StatusTone }>> = {
  inspecao: {
    aprovado:      { label: "Aprovado",      tone: "success" },
    reprovado:     { label: "Reprovado",     tone: "destructive" },
    pendente:      { label: "Pendente",      tone: "warning" },
    em_andamento:  { label: "Em Andamento",  tone: "info" },
  },
  plano: {
    planejado:    { label: "Planejado",     tone: "neutral" },
    em_andamento: { label: "Em Andamento",  tone: "info" },
    concluido:    { label: "Concluído",     tone: "success" },
    atrasado:     { label: "Atrasado",      tone: "destructive" },
    cancelado:    { label: "Cancelado",     tone: "neutral" },
  },
  lote: {
    bloqueado:  { label: "Bloqueado",   tone: "destructive" },
    liberado:   { label: "Liberado",    tone: "success" },
    retrabalho: { label: "Retrabalho",  tone: "warning" },
    devolvido:  { label: "Devolvido",   tone: "warning" },
    descartado: { label: "Descartado",  tone: "neutral" },
  },
  conformidade: {
    conforme:     { label: "Conforme",      tone: "success" },
    nao_conforme: { label: "Não Conforme",  tone: "destructive" },
  },
};

interface QualityStatusBadgeProps {
  kind: QualityStatusKind;
  status: string;
  pulse?: boolean;
}

// Badge de status único pro módulo Qualidade, com presets por "família"
// (Inspeção/Plano de Ação/Lote/Conformidade) — em cima do StatusPill genérico
// já usado em Configurações, sem duplicar a lógica visual de tom/cor.
export function QualityStatusBadge({ kind, status, pulse }: QualityStatusBadgeProps) {
  const preset = PRESETS[kind][status] ?? { label: status, tone: "neutral" as StatusTone };
  return <StatusPill label={preset.label} tone={preset.tone} pulse={pulse} />;
}
