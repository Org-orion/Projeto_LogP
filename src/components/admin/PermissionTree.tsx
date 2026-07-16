"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionGroup } from "@/components/admin/PermissionGroup";
import type { PermissaoRow } from "@/types/rbac";

interface PermissionTreeProps {
  catalogo: PermissaoRow[];
  selecionadas: Set<number>;
  onChange: (next: Set<number>) => void;
  disabled?: boolean;
}

// Árvore de permissões módulo × ação, com busca e ações em massa
// (selecionar/limpar tudo). Reaproveitada tanto no cadastro de Perfil quanto
// na tela de Permissões (por perfil).
export function PermissionTree({ catalogo, selecionadas, onChange, disabled }: PermissionTreeProps) {
  const [busca, setBusca] = useState("");

  const porModulo = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrado = termo
      ? catalogo.filter((p) => p.modulo.toLowerCase().includes(termo) || p.label.toLowerCase().includes(termo))
      : catalogo;
    const grupos = new Map<string, PermissaoRow[]>();
    for (const p of filtrado) {
      if (!grupos.has(p.modulo)) grupos.set(p.modulo, []);
      grupos.get(p.modulo)!.push(p);
    }
    return grupos;
  }, [catalogo, busca]);

  function toggle(id: number) {
    const next = new Set(selecionadas);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  }

  function selecionarTudo() {
    onChange(new Set(catalogo.map((p) => p.id)));
  }

  function limparTudo() {
    onChange(new Set());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar módulo ou ação..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        {!disabled && (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={selecionarTudo}>Selecionar tudo</Button>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={limparTudo}>Limpar tudo</Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {porModulo.size === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum módulo encontrado.</p>
        ) : (
          Array.from(porModulo.entries()).map(([modulo, permissoes]) => (
            <PermissionGroup key={modulo} modulo={modulo} permissoes={permissoes} selecionadas={selecionadas} onToggle={toggle} disabled={disabled} />
          ))
        )}
      </div>
    </div>
  );
}
