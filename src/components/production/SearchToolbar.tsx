"use client";

import { Search, RefreshCw, Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MachineSortKey, SortDir } from "./MachineTable";

export type ViewMode = "list" | "cards";

interface SearchToolbarProps {
  busca: string;
  onBuscaChange: (v: string) => void;
  sortBy: MachineSortKey;
  sortDir: SortDir;
  onSortChange: (key: MachineSortKey, dir: SortDir) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onSync: () => void;
  syncing: boolean;
  onAdicionar: () => void;
}

const SORT_OPTIONS: { key: MachineSortKey; dir: SortDir; label: string }[] = [
  { key: "producao",  dir: "desc", label: "Produção (maior primeiro)" },
  { key: "producao",  dir: "asc",  label: "Produção (menor primeiro)" },
  { key: "tendencia", dir: "desc", label: "Tendência (subindo primeiro)" },
  { key: "tendencia", dir: "asc",  label: "Tendência (caindo primeiro)" },
  { key: "status",    dir: "desc", label: "Status (ativas primeiro)" },
  { key: "nome",      dir: "asc",  label: "Nome (A-Z)" },
];

export function SearchToolbar({
  busca, onBuscaChange, sortBy, sortDir, onSortChange,
  viewMode, onViewModeChange, onSync, syncing, onAdicionar,
}: SearchToolbarProps) {
  const sortValue = `${sortBy}:${sortDir}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por máquina ou linha..."
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="pl-8 h-8 w-56 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={sortValue}
          onValueChange={(v) => {
            const [key, dir] = v.split(":") as [MachineSortKey, SortDir];
            onSortChange(key, dir);
          }}
        >
          <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-md border border-input overflow-hidden">
          <Button
            type="button" size="sm" variant={viewMode === "list" ? "default" : "ghost"}
            className="h-8 rounded-none gap-1.5 px-2.5"
            onClick={() => onViewModeChange("list")}
          >
            <ListIcon className="h-3.5 w-3.5" /> Lista
          </Button>
          <Button
            type="button" size="sm" variant={viewMode === "cards" ? "default" : "ghost"}
            className="h-8 rounded-none gap-1.5 px-2.5"
            onClick={() => onViewModeChange("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </Button>
        </div>

        <Button size="sm" variant="outline" onClick={onSync} disabled={syncing} className="h-8 gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>

        <Button size="sm" onClick={onAdicionar} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar Máquina
        </Button>
      </div>
    </div>
  );
}
