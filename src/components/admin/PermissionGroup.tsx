"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PermissaoRow } from "@/types/rbac";

interface PermissionGroupProps {
  modulo: string;
  permissoes: PermissaoRow[];
  selecionadas: Set<number>;
  onToggle: (permissaoId: number) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
}

// Um módulo expansível com suas ações específicas — em vez de uma lista
// enorme de checkboxes soltos, cada módulo (Produção, Qualidade,
// Configurações, Usuários...) vira um card que abre/fecha.
export function PermissionGroup({ modulo, permissoes, selecionadas, onToggle, defaultOpen, disabled }: PermissionGroupProps) {
  const [aberto, setAberto] = useState(!!defaultOpen);
  const marcadas = permissoes.filter((p) => selecionadas.has(p.id)).length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="text-sm font-semibold capitalize">{modulo}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{marcadas}/{permissoes.length}</Badge>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", aberto && "rotate-180")} />
        </div>
      </button>
      {aberto && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
          {permissoes.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={selecionadas.has(p.id)} disabled={disabled} onCheckedChange={() => onToggle(p.id)} />
              {p.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
