"use client";

import type { ReactNode } from "react";

interface QualityPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

// Mesmo padrão visual do SettingsPageHeader (Configurações) — cabeçalho
// reutilizado em todas as páginas do módulo Qualidade.
export function QualityPageHeader({ title, description, actions }: QualityPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
