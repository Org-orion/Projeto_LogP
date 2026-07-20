"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { AQ_STAGE_MAP } from "./aqConfig";
import type { AqTipo, PeriodoAtalho, StatusConformidade, TraceabilityFilters } from "./aqSearch";

const SETORES: Array<{ value: string; label: string }> = [
  { value: "materia_prima", label: "Recebimento" },
  { value: "perfis", label: "Corte e Perfil" },
  { value: "quadro", label: "Núcleo e Prensagem" },
  { value: "porta", label: "Acabamento da Porta" },
  { value: "acabamento", label: "Revestimento do Perfil" },
  { value: "expedicao", label: "Montagem e Expedição" },
];

const TIPOS: Array<{ value: AqTipo; label: string }> = [
  { value: "origem", label: "Origem" },
  { value: "processo", label: "Processo" },
  { value: "expedicao", label: "Expedição" },
  { value: "outro", label: "Outro" },
];

const STATUS_OPTIONS: Array<{ value: StatusConformidade; label: string }> = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não conforme" },
];

function periodoParaDatas(atalho: PeriodoAtalho): { inicio?: string; fim?: string } {
  const hoje = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (atalho) {
    case "todos":      return {};
    case "hoje":       return { inicio: fmt(hoje), fim: fmt(hoje) };
    case "ontem":      { const d = subDays(hoje, 1); return { inicio: fmt(d), fim: fmt(d) }; }
    case "7dias":      return { inicio: fmt(subDays(hoje, 6)), fim: fmt(hoje) };
    case "30dias":     return { inicio: fmt(subDays(hoje, 29)), fim: fmt(hoje) };
    case "mes_atual":  return { inicio: fmt(startOfMonth(hoje)), fim: fmt(hoje) };
    default:           return {};
  }
}

interface TraceabilitySearchPanelProps {
  filters: TraceabilityFilters;
  onChange: (filters: TraceabilityFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  loading?: boolean;
}

export function TraceabilitySearchPanel({ filters, onChange, onSearch, onClear, loading }: TraceabilitySearchPanelProps) {
  const [periodoAtalho, setPeriodoAtalho] = useState<PeriodoAtalho>("30dias");
  const [maisFiltrosAberto, setMaisFiltrosAberto] = useState(false);
  const [maquinas, setMaquinas] = useState<string[]>([]);

  // Lista real de máquinas (tabela `maquinas`, já usada em MaquinasPage.tsx) —
  // pro autocomplete, em vez de uma lista de chips ou dado inventado.
  useEffect(() => {
    let cancelado = false;
    supabase.from("maquinas").select("nome").order("nome").then(({ data }) => {
      if (!cancelado) setMaquinas((data ?? []).map(m => String(m.nome)).filter(Boolean));
    });
    return () => { cancelado = true; };
  }, []);

  // O seletor de período já mostra "Últimos 30 dias" selecionado por padrão —
  // aplica esse período de verdade nos filtros assim que a tela monta, senão
  // a busca sai sem filtro nenhum de data (visual e comportamento divergiam).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!filters.periodoInicio && !filters.periodoFim) {
      const { inicio, fim } = periodoParaDatas("30dias");
      onChange({ ...filters, periodoInicio: inicio, periodoFim: fim });
    }
  }, []);

  const aqOptions = useMemo(
    () => Object.entries(AQ_STAGE_MAP).map(([codigo, info]) => ({ codigo, nome: info.nome })),
    []
  );

  function set<K extends keyof TraceabilityFilters>(key: K, value: TraceabilityFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function aplicarPeriodo(atalho: PeriodoAtalho) {
    setPeriodoAtalho(atalho);
    if (atalho === "personalizado") return;
    const { inicio, fim } = periodoParaDatas(atalho);
    onChange({ ...filters, periodoInicio: inicio, periodoFim: fim });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Filtros de busca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Linha 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Período da produção</Label>
            <Select value={periodoAtalho} onValueChange={(v) => aplicarPeriodo(v as PeriodoAtalho)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="mes_atual">Mês atual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodoAtalho === "personalizado" && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="date"
                  value={filters.periodoInicio ?? ""}
                  onChange={(e) => set("periodoInicio", e.target.value || undefined)}
                  className="h-8 text-xs border border-input rounded-md px-2 bg-transparent w-full"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  value={filters.periodoFim ?? ""}
                  onChange={(e) => set("periodoFim", e.target.value || undefined)}
                  className="h-8 text-xs border border-input rounded-md px-2 bg-transparent w-full"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nº do lote</Label>
            <Input
              placeholder="Ex.: LOTE-2026-001"
              value={filters.numeroLote ?? ""}
              onChange={(e) => set("numeroLote", e.target.value || undefined)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nº da AQ</Label>
            <Input
              placeholder="Ex.: AQ025"
              list="rastreabilidade-aq-options"
              value={filters.numeroAQ ?? ""}
              onChange={(e) => set("numeroAQ", e.target.value || undefined)}
              className="h-9 text-sm font-mono"
            />
            <datalist id="rastreabilidade-aq-options">
              {aqOptions.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Setor / Etapa</Label>
            <Select value={filters.subprocesso ?? "todos"} onValueChange={(v) => set("subprocesso", v === "todos" ? undefined : (v as TraceabilityFilters["subprocesso"]))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {SETORES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de AQ</Label>
            <Select value={filters.tipo ?? "todos"} onValueChange={(v) => set("tipo", v === "todos" ? undefined : (v as AqTipo))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Máquina</Label>
            <Input
              placeholder="Nome da máquina"
              list="rastreabilidade-maquina-options"
              value={filters.maquina ?? ""}
              onChange={(e) => set("maquina", e.target.value || undefined)}
              className="h-9 text-sm"
            />
            <datalist id="rastreabilidade-maquina-options">
              {maquinas.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <Input
              placeholder="Nome ou código do produto"
              value={filters.produto ?? ""}
              onChange={(e) => set("produto", e.target.value || undefined)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status ?? "todos"} onValueChange={(v) => set("status", v === "todos" ? undefined : (v as StatusConformidade))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Origem do material (AQ)</Label>
            <Input
              placeholder="Ex.: AQ009"
              value={filters.origemAQ ?? ""}
              onChange={(e) => set("origemAQ", e.target.value || undefined)}
              className="h-9 text-sm font-mono"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs text-muted-foreground w-full justify-start"
              onClick={() => setMaisFiltrosAberto(v => !v)}
            >
              {maisFiltrosAberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Mais filtros
            </Button>
          </div>
        </div>

        {/* Mais filtros (recolhido por padrão) */}
        {maisFiltrosAberto && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Linha de produção</Label>
              <Input value={filters.linha ?? ""} onChange={(e) => set("linha", e.target.value || undefined)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pedido</Label>
              <Input value={filters.pedido ?? ""} onChange={(e) => set("pedido", e.target.value || undefined)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input value={filters.cliente ?? ""} onChange={(e) => set("cliente", e.target.value || undefined)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <Input value={filters.fornecedor ?? ""} onChange={(e) => set("fornecedor", e.target.value || undefined)} className="h-9 text-sm" />
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
          <label className="flex items-center gap-2 text-xs text-muted-foreground pt-3 cursor-pointer">
            <Switch
              checked={!!filters.somenteNaoConformidade}
              onCheckedChange={(v) => set("somenteNaoConformidade", v || undefined)}
            />
            Buscar apenas registros com não conformidades
          </label>
          <div className="flex items-center gap-2 pt-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onClear}>
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
            <Button size="sm" className="gap-1.5" onClick={onSearch} disabled={loading}>
              <Search className="h-3.5 w-3.5" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
