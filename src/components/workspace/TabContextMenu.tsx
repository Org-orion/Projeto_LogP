"use client";

import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useWorkspace, HOME_TAB_ID, type WorkspaceTab } from "@/context/workspace-context";
import { toast } from "sonner";

export function TabContextMenu({ tab, children }: { tab: WorkspaceTab; children: React.ReactNode }) {
  const { requestClose, closeOthers, closeToRight, duplicate, refresh } = useWorkspace();
  const isHome = tab.id === HOME_TAB_ID;

  function copiarRota() {
    const url = tab.kind === "route" ? `${window.location.origin}${tab.href}` : window.location.origin;
    void navigator.clipboard.writeText(url);
    toast.success("Rota copiada");
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled={isHome} onClick={() => requestClose(tab.id)}>Fechar</ContextMenuItem>
        <ContextMenuItem onClick={() => closeOthers(tab.id)}>Fechar outras</ContextMenuItem>
        <ContextMenuItem onClick={() => closeToRight(tab.id)}>Fechar à direita</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => duplicate(tab.id)}>Duplicar</ContextMenuItem>
        <ContextMenuItem onClick={() => refresh(tab.id)}>Atualizar</ContextMenuItem>
        <ContextMenuItem onClick={copiarRota}>Copiar rota</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
