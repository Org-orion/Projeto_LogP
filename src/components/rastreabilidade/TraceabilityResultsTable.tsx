"use client";

import { useState } from "react";
import {
  LayoutGrid, List as ListIcon, Download, RefreshCw, Columns3,
  Eye, Map as MapIcon, FileText, History, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { QualityStatusBadge } from "@/components/qualidade/QualityStatusBadge";
import { EmptyState } from "@/components/production/EmptyState";
import { Inbox } from "lucide-react";
import { AQ_RECEBE_DE } from "./aqConfig";
import { classificarStatus, exportarGruposComoCsv, fmtData, maquinasDoGrupo, type LoteGroup } from "./aqSearch";

function dataHoraDoGrupo(group: LoteGroup): string {
  const ultimo = [...group.records].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))[0];
  const hora = ultimo?.hora_final ?? ultimo?.hora_inicial;
  return `${fmtData(group.ultimaData)}${hora ? ` ${String(hora).slice(0, 5)}` : ""}`;
}

interface TraceabilityResultsTableProps {
  hasSearched: boolean;
  loading: boolean;
  error: string | null;
  groups: LoteGroup[];
  onVerDetalhes: (group: LoteGroup) => void;
  onAbrirMapa: (group: LoteGroup) => void;
  onLimparFiltros: () => void;
  onAtualizar: () => void;
}

export function TraceabilityResultsTable({
  hasSearched, loading, error, groups, onVerDetalhes, onAbrirMapa, onLimparFiltros, onAtualizar,
}: TraceabilityResultsTableProps) {
  const [modo, setModo] = useState<"lista" | "cards">("lista");
  const [mostrarMaquina, setMostrarMaquina] = useState(true);
  const [mostrarOrigem, setMostrarOrigem] = useState(true);

  const columns: SettingsTableColumn<LoteGroup>[] = [
    { key: "lote", header: "Nº do lote", render: (g) => <span className="font-mono text-xs font-semibold">{g.loteId.startsWith("sem_lote:") ? "—" : g.loteId}</span> },
    { key: "aq", header: "Nº da AQ", render: (g) => g.currentAQ ? <Badge variant="outline" className="font-mono text-[10px]">{g.currentAQ}</Badge> : "—" },
    { key: "etapa", header: "Setor / Etapa", render: (g) => <span className="text-xs">{g.currentEtapa ?? "—"}</span>, className: "max-w-[160px]" },
    ...(mostrarMaquina ? [{ key: "maquina", header: "Máquina(s)", render: (g: LoteGroup) => <span className="text-xs" title={g.records.map(r => r.maquina).filter(Boolean).join(", ")}>{maquinasDoGrupo(g)}</span>, hideOnMobile: true } as SettingsTableColumn<LoteGroup>] : []),
    { key: "produto", header: "Produto", render: (g) => <span className="text-xs">{g.produto ?? "—"}</span>, className: "max-w-[160px]" },
    { key: "data", header: "Data / Hora", render: (g) => <span className="text-xs font-mono whitespace-nowrap">{dataHoraDoGrupo(g)}</span> },
    { key: "status", header: "Status", render: (g) => <QualityStatusBadge kind="conformidade" status={classificarStatus(g)} /> },
    ...(mostrarOrigem ? [{
      key: "origem", header: "Origem",
      render: (g: LoteGroup) => {
        const origens = g.currentAQ ? (AQ_RECEBE_DE[g.currentAQ] ?? []) : [];
        if (origens.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {origens.map(o => <Badge key={o} variant="outline" className="font-mono text-[10px] px-1">{o}</Badge>)}
          </div>
        );
      },
      hideOnMobile: true,
    } as SettingsTableColumn<LoteGroup>] : []),
    {
      key: "acoes", header: "Ações", className: "text-right",
      render: (g) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalhes" onClick={(e) => { e.stopPropagation(); onVerDetalhes(g); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir mapa" onClick={(e) => { e.stopPropagation(); onAbrirMapa(g); }}>
            <MapIcon className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVerDetalhes(g)}><FileText className="h-3.5 w-3.5 mr-2" />Abrir ficha da AQ</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onVerDetalhes(g)}><History className="h-3.5 w-3.5 mr-2" />Ver histórico</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Resultados da busca</CardTitle>
            {hasSearched && !loading && (
              <Badge variant="outline" className="text-[10px]">{groups.length} registro{groups.length !== 1 ? "s" : ""} encontrado{groups.length !== 1 ? "s" : ""}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Selecionar colunas"><Columns3 className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem checked={mostrarMaquina} onCheckedChange={setMostrarMaquina}>Máquina(s)</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={mostrarOrigem} onCheckedChange={setMostrarOrigem}>Origem</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Exportar" onClick={() => exportarGruposComoCsv(groups)} disabled={groups.length === 0}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Atualizar" onClick={onAtualizar}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant={modo === "lista" ? "secondary" : "ghost"} className="h-8 w-8" title="Lista" onClick={() => setModo("lista")}>
              <ListIcon className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant={modo === "cards" ? "secondary" : "ghost"} className="h-8 w-8" title="Cards" onClick={() => setModo("cards")}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasSearched && !loading ? (
          <EmptyState icon={Inbox} title="Realize uma busca" description="Realize uma busca para visualizar os registros de rastreabilidade." />
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={onAtualizar}>Tentar novamente</Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado para os filtros selecionados.</p>
            <Button size="sm" variant="outline" onClick={onLimparFiltros}>Limpar filtros</Button>
          </div>
        ) : modo === "lista" ? (
          <SettingsTable
            columns={columns}
            rows={groups}
            getRowId={(g) => g.loteId}
            searchFn={(g, term) => g.loteId.toLowerCase().includes(term) || (g.produto ?? "").toLowerCase().includes(term)}
            onRowClick={onVerDetalhes}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map(g => (
              <button
                key={g.loteId}
                onClick={() => onVerDetalhes(g)}
                className="text-left rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-semibold">{g.loteId}</span>
                  {g.currentAQ && <Badge variant="outline" className="font-mono text-[10px]">{g.currentAQ}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">{g.currentEtapa ?? "—"}</p>
                <p className="text-sm font-medium mb-1.5">{g.produto ?? "—"}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">{fmtData(g.ultimaData)}</span>
                  <QualityStatusBadge kind="conformidade" status={classificarStatus(g)} />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
