"use client";

import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

// Agrupa um bloco de configurações relacionadas (ex.: "Produção" dentro de
// Parâmetros do Sistema) — só estrutura/tipografia, sem cartão próprio (use
// <SettingsCard> dentro se quiser um contêiner visual).
export function SettingsSection({ title, description, children, actions }: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
