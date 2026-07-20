"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpinnerCustom } from "@/components/ui/spinner";
import { SettingsTable, type SettingsTableColumn } from "@/components/configuracoes/SettingsTable";
import { ValidationFindingsCard } from "@/components/rastreabilidade/ValidationFindingsCard";
import { AQ_GRAPH, AQ_FINDINGS, AQ_EMITS_TO, type AqFinding, type AqNode } from "@/components/rastreabilidade/aqGraph";
import { AQ_RECEBE_DE } from "@/components/rastreabilidade/aqConfig";
import {
  buscarDetalheLote, buscarGrupoPorAQNumero, calcularFluxo, labelDoLote,
  type CadeiaNode, type LoteGroup,
} from "@/components/rastreabilidade/aqSearch";
import { useDetalhesDoLote } from "@/components/rastreabilidade/useDetalhesDoLote";
import { AqLotesDoNoCard } from "@/components/rastreabilidade/AqLotesDoNoCard";
import { TraceabilityDetailsDrawer } from "@/components/rastreabilidade/TraceabilityDetailsDrawer";
import { ListaCadeiaPorNivel } from "@/components/rastreabilidade/ListaCadeiaPorNivel";

// Mapa visual (React Flow) é pesado — carregado só quando esta view é
// montada (dentro da própria página de consulta, sem navegação/aba nova).
const AqFlowMap = lazy(() => import("@/components/rastreabilidade/AqFlowMap").then(m => ({ default: m.AqFlowMap })));

const LEGENDA = [
  { tom: "bg-status-info/70",    label: "Origem" },
  { tom: "bg-primary/70",        label: "Processo" },
  { tom: "bg-warning/70",        label: "Acabamento / Revestimento" },
  { tom: "bg-status-success",    label: "Expedição / caminho destacado" },
  { tom: "bg-muted-foreground/40 border border-dashed border-muted-foreground", label: "Fora do fluxo oficial" },
];

export interface RastreabilidadeMapaViewProps {
  loteParam?: string | null;
  aqParam?: string | null;
  numeroParam?: string | null;
  maquinaParam?: string | null;
  /** Botão "voltar" — decide pra onde volta (mesma página ou rota própria). */
  onVoltar: () => void;
  /** Clicar num lote relacionado (origem/destino) — mesma página, sem navegar. */
  onAbrirLote: (loteId: string) => void;
}

// Conteúdo do mapa de rastreabilidade — usado tanto embutido na própria
// página de consulta (/rastreabilidade, alternando com a busca, sem abrir
// aba/rota nova) quanto pela rota própria /rastreabilidade/mapa (acesso
// direto por link/bookmark). O componente em si não sabe qual dos dois
// contextos está sendo usado — isso fica a cargo de quem o renderiza, via
// onVoltar/onAbrirLote.
export function RastreabilidadeMapaView({
  loteParam, aqParam, numeroParam, maquinaParam, onVoltar, onAbrirLote,
}: RastreabilidadeMapaViewProps) {
  const temContextoDeLote = !!loteParam || (!!aqParam && !!numeroParam);

  const [loading, setLoading] = useState(temContextoDeLote);
  const [lote, setLote] = useState<LoteGroup | null>(null);
  const [focusedFinding, setFocusedFinding] = useState<AqFinding | null>(null);
  const { origins, children, cadeia, cadeiaLoading } = useDetalhesDoLote(lote);

  // AQ selecionada no fluxograma (clique num card) — mostra o painel de
  // lotes daquela AQ abaixo do mapa. Independente do `lote` de contexto da
  // página (que pode não existir na visão geral).
  const [selectedAQ, setSelectedAQ] = useState<string | null>(null);

  // Drawer de detalhe do lote, aberto a partir do painel "Lotes da AQ" —
  // mesmo componente já usado na página de consulta.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<LoteGroup | null>(null);
  const drawerDetalhes = useDetalhesDoLote(drawerGroup);

  useEffect(() => {
    if (!temContextoDeLote) return;
    let cancelado = false;
    setLoading(true);
    setLote(null);
    const busca = loteParam
      ? buscarDetalheLote(loteParam).then(d => d.group)
      : buscarGrupoPorAQNumero(aqParam!.toUpperCase(), numeroParam!);

    busca.then((group) => {
      if (cancelado) return;
      setLote(group);
      setLoading(false);
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteParam, aqParam, numeroParam]);

  // Contexto novo (ex.: "Ver rastreabilidade completa" recentralizando o
  // mapa noutro lote) — fecha o painel de nó selecionado e o drawer, senão
  // ficariam mostrando dados do contexto anterior.
  useEffect(() => {
    setSelectedAQ(null);
    setDrawerOpen(false);
    setDrawerGroup(null);
  }, [loteParam, aqParam, numeroParam]);

  function handleVerDetalhesNoPainel(group: LoteGroup) {
    setDrawerGroup(group);
    setDrawerOpen(true);
  }

  function handleVerRastreabilidadeCompleta(loteId: string) {
    setDrawerOpen(false);
    onAbrirLote(loteId);
  }

  const highlightPath = useMemo(() => {
    if (!lote) return undefined;
    // O caminho destacado usa a cadeia INTEIRA (recursiva, até a origem final
    // e até onde os dados de destino existirem) — não só o vizinho de 1
    // passo. Enquanto a cadeia completa ainda está carregando, usa o 1º
    // passo (atual + origem/destino direto) como fallback visual imediato.
    const atual = calcularFluxo(lote.records).filter(s => s.status !== "pendente" && s.status !== "ignorado").map(s => s.aq);
    if (cadeia) return [...new Set([...atual, ...cadeia.aqsNaCadeia])];
    const daOrigem = origins.map(o => o.currentAQ).filter((aq): aq is string => !!aq);
    const doDestino = children.map(c => c.currentAQ).filter((aq): aq is string => !!aq);
    return [...new Set([...atual, ...daOrigem, ...doDestino])];
  }, [lote, origins, children, cadeia]);

  const resumo = useMemo(() => {
    const totalAQs = AQ_GRAPH.nodes.length;
    const origens = AQ_GRAPH.nodes.filter(n => n.subprocesso === "materia_prima").length;
    const expedicoes = AQ_GRAPH.nodes.filter(n => n.subprocesso === "expedicao").length;
    const processo = totalAQs - origens - expedicoes;
    return { totalAQs, origens, processo, expedicoes, conexoes: AQ_GRAPH.edges.length };
  }, []);

  const contexto = temContextoDeLote
    ? { titulo: lote ? `Lote ${labelDoLote(lote)}` : "Não encontrado", sub: lote?.currentEtapa ?? undefined }
    : aqParam
      ? { titulo: aqParam.toUpperCase(), sub: undefined }
      : maquinaParam
        ? { titulo: maquinaParam, sub: undefined }
        : { titulo: "Visão geral", sub: undefined };

  const colunasAQ: SettingsTableColumn<AqNode>[] = [
    { key: "aq", header: "Nº AQ", render: (n) => <Badge variant="outline" className="font-mono text-[10px]">{n.id}</Badge> },
    { key: "nome", header: "Setor / Máquina", render: (n) => <span className="text-xs">{n.nome}</span> },
    { key: "tipo", header: "Tipo", render: (n) => <span className="text-xs text-muted-foreground">{n.subprocesso ?? "não cadastrado"}</span> },
    {
      key: "recebe", header: "Recebe de",
      render: (n) => {
        const origens = AQ_RECEBE_DE[n.id] ?? [];
        return origens.length ? <span className="text-xs font-mono">{origens.join(", ")}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
      hideOnMobile: true,
    },
    {
      key: "emite", header: "Emite para",
      render: (n) => {
        const destinos = AQ_EMITS_TO[n.id] ?? [];
        return destinos.length ? <span className="text-xs font-mono">{destinos.join(", ")}</span> : <span className="text-xs text-muted-foreground">Saída final</span>;
      },
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onVoltar}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Mapeamento de Rastreabilidade por AQs</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxo completo do recebimento até a expedição, com conexões baseadas nos lotes de origem.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{contexto.titulo}</Badge>
            {contexto.sub && <span className="text-xs text-muted-foreground">{contexto.sub}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(window.location.href); }}>
            <Share2 className="h-3.5 w-3.5" /> Copiar link
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
      ) : (
        <>
          {/* Resumo + legenda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Resumo do fluxo</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { label: "Total de AQs", valor: resumo.totalAQs },
                    { label: "Pontos de origem", valor: resumo.origens },
                    { label: "Etapas de processo", valor: resumo.processo },
                    { label: "Expedição/Montagem", valor: resumo.expedicoes },
                    { label: "Conexões", valor: resumo.conexoes },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border border-border p-2.5">
                      <p className="text-lg font-bold text-primary">{item.valor}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Legenda</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {LEGENDA.map(l => (
                  <div key={l.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-sm shrink-0 ${l.tom}`} />
                    {l.label}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Lotes relacionados — só faz sentido no contexto de um lote/registro específico */}
          {temContextoDeLote && lote && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">Lotes relacionados</CardTitle>
                {cadeiaLoading ? (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <SpinnerCustom className="h-3 w-3" /> Rastreando cadeia completa...
                  </span>
                ) : cadeia ? (
                  <span className="text-[10px] text-muted-foreground">
                    Cadeia completa: {cadeia.aqsNaCadeia.length} AQs · {cadeia.totalLotesPercorridos} lotes percorridos
                    {cadeia.atingiuLimite && " (limite de profundidade atingido)"}
                  </span>
                ) : null}
              </CardHeader>
              <CardContent>
                {(() => {
                  // Enquanto a cadeia completa ainda carrega, mostra o 1º
                  // passo (já disponível) como feedback imediato; assim que
                  // chega, troca pra cadeia inteira (todos os níveis).
                  const nodosOrigem: CadeiaNode[] = cadeia ? cadeia.origens : origins.map(g => ({ group: g, profundidade: 1 }));
                  const nodosDestino: CadeiaNode[] = cadeia ? cadeia.destinos : children.map(g => ({ group: g, profundidade: 1 }));
                  if (nodosOrigem.length === 0 && nodosDestino.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">Nenhum lote de origem ou destino encontrado no banco para este registro.</p>;
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <ArrowLeft className="h-3 w-3" /> Lotes de origem ({nodosOrigem.length})
                        </p>
                        <ListaCadeiaPorNivel nodes={nodosOrigem} direcao="origem" onAbrirLote={(g) => onAbrirLote(g.loteId)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> Lotes gerados ({nodosDestino.length})
                        </p>
                        <ListaCadeiaPorNivel nodes={nodosDestino} direcao="destino" onAbrirLote={(g) => onAbrirLote(g.loteId)} />
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Fluxograma consolidado */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Fluxograma consolidado</CardTitle></CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex items-center justify-center h-[520px]"><SpinnerCustom /></div>}>
                <AqFlowMap
                  highlightPath={highlightPath}
                  focusedFinding={focusedFinding}
                  onNodeSelect={setSelectedAQ}
                  className="h-[520px] rounded-lg border border-border overflow-hidden"
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Lotes da AQ selecionada no fluxograma */}
          {selectedAQ && (
            <AqLotesDoNoCard
              aqCode={selectedAQ}
              onVerDetalhes={handleVerDetalhesNoPainel}
              onVerRastreabilidadeCompleta={handleVerRastreabilidadeCompleta}
              onFechar={() => setSelectedAQ(null)}
            />
          )}

          {/* Achados da validação */}
          <ValidationFindingsCard findings={AQ_FINDINGS} onDestacar={setFocusedFinding} />

          {/* Tabela consolidada de AQs */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tabela de AQs</CardTitle></CardHeader>
            <CardContent>
              <SettingsTable
                columns={colunasAQ}
                rows={AQ_GRAPH.nodes}
                getRowId={(n) => n.id}
                searchPlaceholder="Buscar AQ..."
                searchFn={(n, term) => n.id.toLowerCase().includes(term) || n.nome.toLowerCase().includes(term)}
                pageSizeOptions={[10, 25, 50]}
              />
            </CardContent>
          </Card>
        </>
      )}

      <TraceabilityDetailsDrawer
        group={drawerGroup}
        origins={drawerDetalhes.origins}
        children={drawerDetalhes.children}
        cadeia={drawerDetalhes.cadeia}
        cadeiaLoading={drawerDetalhes.cadeiaLoading}
        loading={drawerDetalhes.loading}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAbrirMapa={(group) => handleVerRastreabilidadeCompleta(group.loteId)}
        onAbrirLote={handleVerDetalhesNoPainel}
      />
    </div>
  );
}
