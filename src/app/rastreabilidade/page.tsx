"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequirePagina } from "@/components/RequirePagina";
import { TraceabilityPageHeader } from "@/components/rastreabilidade/TraceabilityPageHeader";
import { TraceabilitySearchPanel } from "@/components/rastreabilidade/TraceabilitySearchPanel";
import { TraceabilityResultsTable } from "@/components/rastreabilidade/TraceabilityResultsTable";
import { TraceabilityDetailsDrawer } from "@/components/rastreabilidade/TraceabilityDetailsDrawer";
import { CadeiaFluxogramaCards } from "@/components/rastreabilidade/CadeiaFluxogramaCards";
import { QuickAccessCard } from "@/components/rastreabilidade/QuickAccessCard";
import { RecentSearchesCard } from "@/components/rastreabilidade/RecentSearchesCard";
import { RastreabilidadeMapaView } from "@/components/rastreabilidade/RastreabilidadeMapaView";
import {
  buscarRegistrosComFiltros, exportarGruposComoCsv,
  type TraceabilityFilters, type LoteGroup,
} from "@/components/rastreabilidade/aqSearch";
import { useDetalhesDoLote } from "@/components/rastreabilidade/useDetalhesDoLote";
import { AQ_CODE_TO_COLUMNS } from "@/components/rastreabilidade/aqConfig";
import {
  lerConsultasRecentes, salvarConsultaRecente, removerConsultaRecente, limparConsultasRecentes,
  type RecentSearch,
} from "@/components/rastreabilidade/recentSearches";

interface MapaContext {
  lote?: string;
  aq?: string;
  numero?: string;
}

// Central de consulta de Rastreabilidade — filtros → resultados → detalhes →
// mapa. O mapa abre embutido nesta MESMA página (troca de seção via estado,
// não navegação) — não deve abrir aba/rota nova.
function RastreabilidadeConsultaInner() {
  const [filters, setFilters] = useState<TraceabilityFilters>({});
  const [groups, setGroups] = useState<LoteGroup[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<LoteGroup | null>(null);
  const { origins: drawerOrigins, children: drawerChildren, cadeia, loading: drawerLoading, cadeiaLoading, error: drawerError } = useDetalhesDoLote(drawerGroup);

  const [recentes, setRecentes] = useState<RecentSearch[]>([]);

  // Quando preenchido, mostra o mapa no lugar da consulta (mesma página).
  const [mapaContext, setMapaContext] = useState<MapaContext | null>(null);

  useEffect(() => { setRecentes(lerConsultasRecentes()); }, []);

  useEffect(() => {
    if (drawerError) toast.error("Erro ao carregar relações do lote: " + drawerError);
  }, [drawerError]);

  const executarBusca = useCallback(async (filtrosParaBuscar: TraceabilityFilters, salvarRecente = true) => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await buscarRegistrosComFiltros(filtrosParaBuscar);
      setGroups(resultado);
      setHasSearched(true);
      setUltimaAtualizacao(new Date());
      if (salvarRecente) {
        const label = filtrosParaBuscar.numeroLote || filtrosParaBuscar.numeroAQ || filtrosParaBuscar.produto || filtrosParaBuscar.maquina || "Consulta";
        const sublabel = [filtrosParaBuscar.numeroAQ, filtrosParaBuscar.periodoInicio].filter(Boolean).join(" • ");
        setRecentes(salvarConsultaRecente({ label, sublabel, filters: filtrosParaBuscar }));
      }
    } catch (err) {
      setError("Não foi possível carregar os registros. " + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  function handleBuscar() {
    void executarBusca(filters);
  }

  function handleLimparFiltros() {
    setFilters({});
    setGroups([]);
    setHasSearched(false);
    setError(null);
  }

  function handleNovaConsulta() {
    handleLimparFiltros();
  }

  // O grupo clicado já vem com todos os registros carregados (resultado da
  // busca ou das próprias origens/destinos abertos no drawer) — não precisa
  // buscar de novo por Nº do lote (que nem sempre existe, ver aqSearch.ts).
  // `useDetalhesDoLote` cuida de buscar as relações (origem/destino + cadeia
  // completa) a partir daqui.
  function handleVerDetalhes(group: LoteGroup) {
    setDrawerOpen(true);
    setDrawerGroup(group);
  }

  function handleAbrirMapa(group: LoteGroup) {
    setDrawerOpen(false);
    // Sem n_lote de verdade: o número que identifica esse registro mora numa
    // coluna específica de AQ (ver aqSearch.ts) — nesse caso abre por
    // AQ+número em vez de por lote, senão o mapa não acharia nada.
    if (group.loteId.startsWith("sem_lote:") && group.currentAQ) {
      const col = AQ_CODE_TO_COLUMNS[group.currentAQ]?.[0];
      const numero = col ? group.records[0]?.[col] : null;
      if (numero !== null && numero !== undefined) {
        setMapaContext({ aq: group.currentAQ, numero: String(numero) });
        return;
      }
    }
    setMapaContext({ lote: group.loteId });
  }

  function handleAbrirMapaPorLote() {
    if (!filters.numeroLote) {
      toast.info("Informe o número do lote no filtro antes de abrir o mapa.");
      return;
    }
    setMapaContext({ lote: filters.numeroLote });
  }

  function handleAbrirMapaPorAQ() {
    if (!filters.numeroAQ) {
      toast.info("Informe o número da AQ no filtro antes de abrir o mapa.");
      return;
    }
    setMapaContext({ aq: filters.numeroAQ.toUpperCase() });
  }

  function handleVoltarDaConsulta() {
    setMapaContext(null);
  }

  function handleAbrirLoteNoMapa(loteId: string) {
    setMapaContext({ lote: loteId });
  }

  function handleExportarResultados() {
    if (groups.length === 0) {
      toast.info("Faça uma busca antes de exportar.");
      return;
    }
    exportarGruposComoCsv(groups);
  }

  function handleSelecionarRecente(entry: RecentSearch) {
    setFilters(entry.filters);
    void executarBusca(entry.filters, false);
  }

  function handleRemoverRecente(id: string) {
    setRecentes(removerConsultaRecente(id));
  }

  function handleLimparRecentes() {
    limparConsultasRecentes();
    setRecentes([]);
  }

  // Resultados da busca costumam ser "pontas" da mesma cadeia (ex.: buscar
  // lote+AQ traz tanto quem gerou quanto quem recebeu) — o fluxograma mostra
  // UMA cadeia só, ancorada no resultado mais específico: o que bate com a
  // AQ filtrada, se houver; senão o primeiro resultado.
  const groupAncora = useMemo(() => {
    if (groups.length === 0) return null;
    if (filters.numeroAQ) {
      const aqAlvo = filters.numeroAQ.trim().toUpperCase();
      const match = groups.find(g => g.currentAQ === aqAlvo);
      if (match) return match;
    }
    return groups[0];
  }, [groups, filters.numeroAQ]);

  if (mapaContext) {
    return (
      <RastreabilidadeMapaView
        loteParam={mapaContext.lote}
        aqParam={mapaContext.aq}
        numeroParam={mapaContext.numero}
        onVoltar={handleVoltarDaConsulta}
        onAbrirLote={handleAbrirLoteNoMapa}
      />
    );
  }

  return (
    <div className="space-y-4">
      <TraceabilityPageHeader ultimaAtualizacao={ultimaAtualizacao} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <TraceabilitySearchPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleBuscar}
            onClear={handleLimparFiltros}
            loading={loading}
          />
          {!loading && groupAncora && (
            <CadeiaFluxogramaCards group={groupAncora} onAbrirDetalhes={handleVerDetalhes} />
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <QuickAccessCard
            onNovaConsulta={handleNovaConsulta}
            onAbrirMapaPorLote={handleAbrirMapaPorLote}
            onAbrirMapaPorAQ={handleAbrirMapaPorAQ}
            onExportar={handleExportarResultados}
            exportarDisabled={groups.length === 0}
          />
          <TraceabilityResultsTable
            hasSearched={hasSearched}
            loading={loading}
            error={error}
            groups={groups}
            onVerDetalhes={handleVerDetalhes}
            onAbrirMapa={handleAbrirMapa}
            onLimparFiltros={handleLimparFiltros}
            onAtualizar={handleBuscar}
          />
          <RecentSearchesCard
            items={recentes}
            onSelect={handleSelecionarRecente}
            onRemove={handleRemoverRecente}
            onClear={handleLimparRecentes}
          />
        </div>
      </div>

      <TraceabilityDetailsDrawer
        group={drawerGroup}
        origins={drawerOrigins}
        children={drawerChildren}
        cadeia={cadeia}
        cadeiaLoading={cadeiaLoading}
        loading={drawerLoading}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAbrirMapa={handleAbrirMapa}
        onAbrirLote={handleVerDetalhes}
      />
    </div>
  );
}

export default function RastreabilidadeConsultaPage() {
  return (
    <RequirePagina pagina="rastreabilidade:consulta">
      <RastreabilidadeConsultaInner />
    </RequirePagina>
  );
}
