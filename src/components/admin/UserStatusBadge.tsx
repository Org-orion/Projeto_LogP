"use client";

import { StatusPill, type StatusTone } from "@/components/configuracoes/StatusPill";

export type UsuarioStatus = "ativo" | "pendente" | "bloqueado" | "inativo";

const CONFIG: Record<UsuarioStatus, { label: string; tone: StatusTone }> = {
  ativo:     { label: "Ativo",     tone: "success" },
  pendente:  { label: "Pendente",  tone: "warning" },
  bloqueado: { label: "Bloqueado", tone: "destructive" },
  inativo:   { label: "Inativo",   tone: "neutral" },
};

// 🟢 Ativo · 🟡 Pendente · 🔴 Bloqueado · ⚫ Inativo — em cima do StatusPill
// genérico (tokens do Design System, não emoji cru), consistente com o resto
// do app em light/dark.
export function UserStatusBadge({ status }: { status: UsuarioStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.ativo;
  return <StatusPill label={cfg.label} tone={cfg.tone} pulse={status === "ativo"} />;
}
