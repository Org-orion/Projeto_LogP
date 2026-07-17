"use client";

import { format } from "date-fns";
import { Pencil, Copy, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";

export interface Perfil {
  id: number;
  nome: string;
  descricao: string | null;
  status: "ativo" | "inativo";
  responsavel: string | null;
  created_at: string;
  qtd_usuarios: number;
}

interface RoleTableProps {
  rows: Perfil[];
  modulosPorPerfil: Record<number, number>;
  onEdit: (row: Perfil) => void;
  onDuplicar: (row: Perfil) => void;
  onExcluir: (row: Perfil) => void;
}

export function RoleTable({ rows, modulosPorPerfil, onEdit, onDuplicar, onExcluir }: RoleTableProps) {
  const columns: SettingsTableColumn<Perfil>[] = [
    { key: "nome", header: "Perfil", render: (p) => (
      <div className="flex items-center gap-2">
        {p.nome === "Administrador" && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
        <span className="text-sm font-medium">{p.nome}</span>
      </div>
    ) },
    { key: "descricao", header: "Descrição", hideOnMobile: true, render: (p) => <span className="text-xs text-muted-foreground max-w-64 truncate block">{p.descricao || "—"}</span> },
    { key: "usuarios", header: "Usuários", render: (p) => <Badge variant="outline" className="text-xs">{p.qtd_usuarios}</Badge> },
    { key: "modulos", header: "Módulos Liberados", hideOnMobile: true, render: (p) => <span className="text-xs">{modulosPorPerfil[p.id] ?? 0}</span> },
    { key: "criado", header: "Criado em", hideOnMobile: true, render: (p) => <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created_at), "dd/MM/yyyy")}</span> },
    { key: "responsavel", header: "Responsável", hideOnMobile: true, render: (p) => <span className="text-xs">{p.responsavel || "—"}</span> },
    { key: "acoes", header: "", render: (p) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicar(p)} title="Duplicar perfil"><Copy className="h-3.5 w-3.5" /></Button>
        <Button
          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onExcluir(p)} disabled={p.nome === "Administrador"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) },
  ];

  return (
    <SettingsTable
      columns={columns}
      rows={rows}
      getRowId={(p) => p.id}
      searchPlaceholder="Buscar perfil..."
      searchFn={(p, term) => p.nome.toLowerCase().includes(term) || (p.descricao ?? "").toLowerCase().includes(term)}
      emptyTitle="Nenhum perfil cadastrado"
    />
  );
}
