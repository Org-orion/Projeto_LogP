"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ConnectionBadge from "@/components/ConnectionBadge";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useWorkspace, type WorkspaceTab as WorkspaceTabType } from "@/context/workspace-context";
import { useNcAlerts } from "@/hooks/useNcAlerts";
import { useNfAlerts } from "@/hooks/useNfAlerts";
import { WorkspaceTab } from "@/components/workspace/WorkspaceTab";
import { TabScroller } from "@/components/workspace/TabScroller";
import { TabOverflowMenu } from "@/components/workspace/TabOverflowMenu";

function indicatorFor(tab: WorkspaceTabType, ncCount: number, nfCount: number): number | undefined {
  if (tab.kind === "spa" && tab.section === "qualidade") return ncCount || undefined;
  if (tab.kind === "spa" && tab.section === "material-fsc") return nfCount || undefined;
  if (tab.kind === "route" && tab.href?.startsWith("/qualidade")) return ncCount || undefined;
  return undefined;
}

export function WorkspaceTabs({ onNavigateNC, onNavigateNF }: { onNavigateNC: () => void; onNavigateNF: () => void }) {
  const { tabs, activeId, reorder } = useWorkspace();
  const { theme, setTheme } = useTheme();
  // Chamados uma única vez aqui — reaproveita os mesmos hooks já usados pelo
  // sino de notificações (NotificationPanel), agora com nome de canal único
  // por instância (ver useNcAlerts.ts/useNfAlerts.ts) pra não colidir.
  const { data: ncAlerts = [] } = useNcAlerts();
  const { data: nfAlerts = [] } = useNfAlerts();
  const [hasOverflow, setHasOverflow] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop() {
    if (dragIndex.current !== null && overIndex !== null) {
      reorder(dragIndex.current, overIndex);
    }
    dragIndex.current = null;
    setOverIndex(null);
  }

  return (
    <div className="flex h-11 shrink-0 items-stretch gap-2 bg-sidebar pl-2 pr-2">
      <div className="flex shrink-0 items-center mr-1.5">
        <SidebarTrigger className="h-7 w-7 text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 items-end gap-1 pt-1">
        <TabScroller onOverflowChange={setHasOverflow}>
          <AnimatePresence initial={false}>
            {tabs.map((tab, index) => (
              <WorkspaceTab
                key={tab.id}
                tab={tab}
                index={index}
                isActive={tab.id === activeId}
                indicatorCount={indicatorFor(tab, ncAlerts.length, nfAlerts.length)}
                onDragStart={(i) => { dragIndex.current = i; }}
                onDragOver={(i) => setOverIndex(i)}
                onDrop={handleDrop}
                onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
              />
            ))}
          </AnimatePresence>
        </TabScroller>

        {hasOverflow && <TabOverflowMenu tabs={tabs} />}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pb-1.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <ConnectionBadge variant="onDark" />

        <NotificationPanel onNavigateNC={onNavigateNC} onNavigateNF={onNavigateNF} />
      </div>
    </div>
  );
}
