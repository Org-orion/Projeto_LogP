"use client";

import Link from "next/link";
import {
  Plug, Palette, Bell, DatabaseBackup, type LucideIcon,
} from "lucide-react";
import { CONFIGURACOES_SUBS } from "@/lib/nav-items";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";

const ICONS: Record<string, LucideIcon> = {
  integracoes: Plug,
  aparencia: Palette,
  notificacoes: Bell,
  backup: DatabaseBackup,
};

const DESCRICOES: Record<string, string> = {
  integracoes: "Conexões com ERP, MQTT, webhooks e outros sistemas externos.",
  aparencia: "Tema, densidade e preferências visuais.",
  notificacoes: "Canais e regras de disparo por tipo de evento.",
  backup: "Backup automático e histórico de execuções.",
};

export default function ConfiguracoesHomePage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Configurações"
        description="Gerencie parâmetros operacionais, técnicos e administrativos do sistema."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONFIGURACOES_SUBS.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <Link
              key={item.id}
              href={item.href}
              className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground">{DESCRICOES[item.id]}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
