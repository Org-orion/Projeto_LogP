"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tabIcon, tabLabel, useWorkspace, type WorkspaceTab } from "@/context/workspace-context";

export function TabOverflowMenu({ tabs }: { tabs: WorkspaceTab[] }) {
  const { activeId, activate } = useWorkspace();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-full shrink-0 items-center px-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10 transition-colors"
          aria-label="Todas as abas"
          title="Todas as abas"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-56">
        {tabs.map((tab) => {
          const Icon = tabIcon(tab);
          return (
            <DropdownMenuItem
              key={tab.id}
              onClick={() => activate(tab.id)}
              className={tab.id === activeId ? "font-medium" : undefined}
            >
              <Icon className="mr-2 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tabLabel(tab)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
