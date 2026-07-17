"use client";

import { MoreVertical, History, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Maquina } from "./types";

interface MachineActionsProps {
  maquina: Maquina;
  canEdit: boolean;
  onView: (m: Maquina) => void;
  onEdit: (m: Maquina) => void;
  onLancar?: (() => void) | null;
}

// "Ver histórico e relatórios" reabre o HistoricoSheet (que já tem export
// PDF/Excel dentro) — não são 3 destinos separados, é a mesma tela de sempre.
export function MachineActions({ maquina, canEdit, onView, onEdit, onLancar }: MachineActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onView(maquina)} className="gap-2">
          <History className="h-3.5 w-3.5" />
          Ver histórico e relatórios
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(maquina)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </DropdownMenuItem>
        )}
        {onLancar && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLancar} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Lançar Produção
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
