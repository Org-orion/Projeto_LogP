"use client";

import { ChevronDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type StatusFiltro = "todas" | "ativas" | "inativas";

interface MachineFiltersProps {
  statusFiltro: StatusFiltro;
  onStatusChange: (v: StatusFiltro) => void;
  linhasDisponiveis: string[];
  linhasSelecionadas: Set<string>;
  onToggleLinha: (linha: string) => void;
  anos: string[];
  ano: string;
  onAnoChange: (v: string) => void;
  meses: string[];
  mes: string;
  onMesChange: (v: string) => void;
  onLimpar: () => void;
}

export function MachineFilters({
  statusFiltro, onStatusChange,
  linhasDisponiveis, linhasSelecionadas, onToggleLinha,
  anos, ano, onAnoChange,
  meses, mes, onMesChange,
  onLimpar,
}: MachineFiltersProps) {
  const nenhumaLinha = linhasSelecionadas.size === 0;
  const labelLinha = nenhumaLinha ? "Todas" : `${linhasSelecionadas.size} linha${linhasSelecionadas.size > 1 ? "s" : ""}`;

  return (
    <div className="rounded-xl p-3 flex flex-wrap items-end gap-3 bg-card border border-border">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={statusFiltro} onValueChange={(v) => onStatusChange(v as StatusFiltro)}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="inativas">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Linha</Label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-8 text-xs w-36 border border-input rounded-md px-2 flex items-center justify-between text-foreground bg-transparent"
            >
              <span className="truncate">{labelLinha}</span>
              <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-56" align="start">
            <div className="max-h-72 overflow-y-auto text-xs">
              {linhasDisponiveis.length === 0 ? (
                <p className="px-3 py-2 text-muted-foreground">Nenhuma linha no período.</p>
              ) : linhasDisponiveis.map((l) => (
                <label key={l} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linhasSelecionadas.has(l)}
                    onChange={() => onToggleLinha(l)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="leading-tight">{l}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ano</Label>
        <Select value={ano} onValueChange={onAnoChange}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Mês</Label>
        <Select value={mes} onValueChange={onMesChange}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="sm" variant="ghost" onClick={onLimpar} className="h-8 gap-1.5 text-muted-foreground">
        <X className="h-3.5 w-3.5" /> Limpar filtros
      </Button>
    </div>
  );
}
