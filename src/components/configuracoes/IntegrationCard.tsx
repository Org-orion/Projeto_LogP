"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "./StatusPill";

export type IntegrationStatus = "conectado" | "desconectado" | "erro" | "sincronizando" | "incompleta";

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  conectado: "Conectado",
  desconectado: "Desconectado",
  erro: "Erro",
  sincronizando: "Sincronizando",
  incompleta: "Configuração incompleta",
};

const STATUS_TONE: Record<IntegrationStatus, StatusTone> = {
  conectado: "success",
  desconectado: "neutral",
  erro: "destructive",
  sincronizando: "info",
  incompleta: "warning",
};

interface IntegrationCardProps {
  nome: string;
  icon?: LucideIcon;
  descricao: string;
  status: IntegrationStatus;
  ultimaSincronizacao?: string | null;
  ambiente: string;
  testando?: boolean;
  onConfigurar: () => void;
  onTestarConexao: () => void;
}

export function IntegrationCard({
  nome, icon: Icon = PlugZap, descricao, status, ultimaSincronizacao, ambiente, testando, onConfigurar, onTestarConexao,
}: IntegrationCardProps) {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{nome}</p>
            <p className="text-xs text-muted-foreground">{ambiente}</p>
          </div>
        </div>
        <StatusPill label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} pulse={status === "sincronizando"} />
      </div>

      <p className="text-xs text-muted-foreground">{descricao}</p>

      <p className="text-xs text-muted-foreground">
        Última sincronização: <span className="text-foreground font-medium">{ultimaSincronizacao ?? "—"}</span>
      </p>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button size="sm" variant="outline" className="h-8 flex-1" onClick={onTestarConexao} disabled={testando}>
          {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Testar conexão"}
        </Button>
        <Button size="sm" className="h-8 flex-1" onClick={onConfigurar}>
          Configurar
        </Button>
      </div>
    </div>
  );
}
