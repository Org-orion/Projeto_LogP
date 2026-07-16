"use client";

import { format } from "date-fns";
import {
  MoreHorizontal, Eye, Pencil, Lock, Unlock, KeyRound, Mail, History, Trash2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { UserStatusBadge, type UsuarioStatus } from "@/components/admin/UserStatusBadge";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
  matricula?: string | null;
  cargo?: string | null;
  setor?: string | null;
  telefone?: string | null;
  status?: UsuarioStatus;
  ultimo_login?: string | null;
  ultimo_ip?: string | null;
  deve_trocar_senha?: boolean;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

interface UserTableProps {
  rows: Usuario[];
  currentUserId: string;
  onView: (row: Usuario) => void;
  onEdit: (row: Usuario) => void;
  onBloquear: (row: Usuario) => void;
  onDesbloquear: (row: Usuario) => void;
  onRedefinirSenha: (row: Usuario) => void;
  onHistorico: (row: Usuario) => void;
  onExcluir: (row: Usuario) => void;
}

export function UserTable({
  rows, currentUserId, onView, onEdit, onBloquear, onDesbloquear, onRedefinirSenha, onHistorico, onExcluir,
}: UserTableProps) {
  const columns: SettingsTableColumn<Usuario>[] = [
    { key: "usuario", header: "Usuário", render: (u) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
          {iniciais(u.nome)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1.5">
            {u.nome}
            {u.perfil === "Administrador" && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
          </p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      </div>
    ) },
    { key: "cargo", header: "Cargo / Setor", hideOnMobile: true, render: (u) => (
      <div className="text-xs">
        <div>{u.cargo || "—"}</div>
        <div className="text-muted-foreground">{u.setor || "—"}</div>
      </div>
    ) },
    { key: "perfil", header: "Perfil", render: (u) => (
      u.perfil ? <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">{u.perfil}</Badge> : "—"
    ) },
    { key: "status", header: "Status", render: (u) => <UserStatusBadge status={u.status ?? "ativo"} /> },
    { key: "ultimo_login", header: "Último Acesso", hideOnMobile: true, render: (u) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {u.ultimo_login ? format(new Date(u.ultimo_login), "dd/MM/yyyy HH:mm") : "Nunca acessou"}
      </span>
    ) },
    { key: "acoes", header: "", render: (u) => (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onView(u)}><Eye className="h-4 w-4 mr-2" /> Visualizar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(u)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHistorico(u)}><History className="h-4 w-4 mr-2" /> Ver histórico</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRedefinirSenha(u)}><KeyRound className="h-4 w-4 mr-2" /> Redefinir senha</DropdownMenuItem>
            <DropdownMenuItem disabled title="Envio de e-mail não configurado neste projeto">
              <Mail className="h-4 w-4 mr-2" /> Enviar convite
            </DropdownMenuItem>
            {u.status === "bloqueado" ? (
              <DropdownMenuItem onClick={() => onDesbloquear(u)}><Unlock className="h-4 w-4 mr-2" /> Desbloquear</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onBloquear(u)} disabled={u.id === currentUserId}>
                <Lock className="h-4 w-4 mr-2" /> Bloquear
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onExcluir(u)}
              disabled={u.id === currentUserId}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) },
  ];

  return (
    <SettingsTable
      columns={columns}
      rows={rows}
      getRowId={(u) => u.id}
      searchPlaceholder="Buscar por nome, e-mail, matrícula, cargo, perfil ou setor..."
      searchFn={(u, term) =>
        u.nome.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.matricula ?? "").toLowerCase().includes(term) ||
        (u.cargo ?? "").toLowerCase().includes(term) ||
        (u.perfil ?? "").toLowerCase().includes(term) ||
        (u.setor ?? "").toLowerCase().includes(term)
      }
      emptyTitle="Nenhum usuário encontrado"
      emptyDescription="Ajuste a busca/filtros ou cadastre um novo usuário."
    />
  );
}
