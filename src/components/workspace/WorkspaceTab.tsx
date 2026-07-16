"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOME_TAB_ID, tabIcon, tabLabel, useWorkspace, type WorkspaceTab as WorkspaceTabType } from "@/context/workspace-context";
import { TabContextMenu } from "@/components/workspace/TabContextMenu";

export function WorkspaceTab({
  tab, isActive, indicatorCount, index, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  tab: WorkspaceTabType;
  isActive: boolean;
  indicatorCount?: number;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { activate, requestClose } = useWorkspace();
  const Icon = tabIcon(tab);
  const label = tabLabel(tab);
  const isHome = tab.id === HOME_TAB_ID;

  return (
    <TabContextMenu tab={tab}>
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.16 }}
        draggable={!isHome}
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDrop={(e) => { e.preventDefault(); onDrop(); }}
        onDragEnd={onDragEnd}
        onClick={() => activate(tab.id)}
        title={label}
        className={cn(
          "group relative flex h-8 shrink-0 select-none items-center gap-1.5 rounded-t-lg px-3 text-xs transition-colors cursor-pointer max-w-[190px]",
          isActive
            ? "bg-background text-foreground shadow-sm"
            : "bg-sidebar-foreground/0 text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="truncate">{label}</span>

        {!!indicatorCount && (
          <span
            title={`${indicatorCount} não conformidade${indicatorCount > 1 ? "s" : ""} aberta${indicatorCount > 1 ? "s" : ""}`}
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              isActive ? "bg-destructive" : "bg-destructive/80",
            )}
          />
        )}

        {!isHome && (
          tab.dirty ? (
            <span className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" title="Alterações não salvas" />
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); requestClose(tab.id); }}
              className={cn(
                "ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors",
                "hover:bg-destructive hover:text-destructive-foreground",
              )}
              aria-label={`Fechar ${label}`}
            >
              <X className="h-3 w-3" />
            </button>
          )
        )}

        {isActive && (
          <motion.span
            layoutId="workspace-tab-indicator"
            className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-primary"
          />
        )}
      </motion.div>
    </TabContextMenu>
  );
}
