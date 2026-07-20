"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow, ReactFlowProvider, Controls, Background, BackgroundVariant,
  MarkerType, useReactFlow, type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./aqFlowTheme.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpinnerCustom } from "@/components/ui/spinner";
import { AQ_RECEBE_DE, AQ_STAGE_MAP } from "./aqConfig";
import { agruparPorNivel, pecasDoGrupo, type CadeiaNode, type LoteGroup } from "./aqSearch";
import { useDetalhesDoLote } from "./useDetalhesDoLote";
import { CadeiaCardNode, type CadeiaCardNodeData } from "./CadeiaCardNode";

const nodeTypes = { cadeiaCard: CadeiaCardNode };

const CARD_WIDTH = 200;
// Card real: badge/nome + 4 pares label/valor (Lote, Fabricado em, Quantidade,
// Produto) + padding — 128 datava de antes da linha "Lote" existir no card
// (CadeiaCardNode.tsx) e ficou baixo demais, sobrepondo os cards da coluna.
const CARD_HEIGHT = 200;
const GAP_X = 90;
const GAP_Y = 20;

/**
 * Agrupa os grupos de um nível (mesma distância de busca do lote pesquisado)
 * por AQ — cada AQ distinta vira sua PRÓPRIA coluna, em vez de todas
 * empilhadas numa coluna só. Ordenado pelo código da AQ (critério simples e
 * estável) — não dá pra usar a posição no PROCESS_FLOW_ORDER como critério de
 * coluna global (foi tentado e revertido): esse array agrupa por "Bloco"
 * administrativo, não por ordem estrita de produção, e quebra exatamente nas
 * 8 AQs que formam o componente cíclico já identificado nesta sessão
 * (AQ015/016/017/019/021/039/041/042) — não existe uma ordem linear única
 * possível ali. A distância de busca (BFS) já é o dado correto e imune a
 * ciclo; o problema era só empilhar AQs diferentes na mesma coluna.
 */
function gruposPorAQ(itens: CadeiaNode[]): LoteGroup[][] {
  const porAQ = new Map<string, LoteGroup[]>();
  for (const { group: g } of itens) {
    const chave = g.currentAQ ?? "—";
    if (!porAQ.has(chave)) porAQ.set(chave, []);
    porAQ.get(chave)!.push(g);
  }
  return [...porAQ.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, grupos]) => grupos);
}

interface CardInfo {
  group: LoteGroup;
  peca: string;
  pecaSuspeita: boolean;
  id: string;
}

/** Uma peça específica de um grupo vira um card — id único quando o grupo tem mais de 1 peça (ver pecasDoGrupo). */
function cardsDoGrupo(group: LoteGroup): CardInfo[] {
  const pecas = pecasDoGrupo(group);
  return pecas.map(p => ({
    group, peca: p.valor, pecaSuspeita: p.suspeita,
    id: pecas.length > 1 ? `${group.loteId}::${p.valor}` : group.loteId,
  }));
}

function montarColuna(
  cards: CardInfo[],
  colunaIndex: number,
  onAbrirDetalhes: (group: LoteGroup) => void,
  nodes: Node<CadeiaCardNodeData>[],
) {
  const alturaTotal = cards.length * (CARD_HEIGHT + GAP_Y) - GAP_Y;
  cards.forEach(({ group, peca, pecaSuspeita, id }, i) => {
    nodes.push({
      id,
      type: "cadeiaCard",
      position: { x: colunaIndex * (CARD_WIDTH + GAP_X), y: i * (CARD_HEIGHT + GAP_Y) - alturaTotal / 2 },
      data: {
        group,
        nomeAQ: group.currentAQ ? (AQ_STAGE_MAP[group.currentAQ]?.nome ?? null) : null,
        peca,
        pecaSuspeita,
        onAbrirDetalhes,
      },
    });
  });
}

export interface CadeiaFluxogramaCardsProps {
  group: LoteGroup | null;
  onAbrirDetalhes: (group: LoteGroup) => void;
}

function CadeiaFluxogramaInner({ group, cadeia, onAbrirDetalhes }: {
  group: LoteGroup;
  cadeia: ReturnType<typeof useDetalhesDoLote>["cadeia"];
  onAbrirDetalhes: (group: LoteGroup) => void;
}) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<CadeiaCardNodeData>[] = [];
    const edges: Edge[] = [];

    // Bandas em ordem esquerda→direita: origem mais distante primeiro, ...,
    // origem mais próxima, atual, destino mais próximo, ..., destino mais
    // distante — a mesma distância de busca (BFS) de antes, só que agora
    // cada banda é dividida em uma coluna POR AQ distinta (gruposPorAQ), em
    // vez de empilhar todas as AQs daquele nível na mesma coluna.
    const colunasOrigem = cadeia ? [...agruparPorNivel(cadeia.origens)].sort((a, b) => b.profundidade - a.profundidade) : [];
    const colunasDestino = cadeia ? agruparPorNivel(cadeia.destinos) : [];

    const todasColunas: LoteGroup[][] = [
      ...colunasOrigem.flatMap(col => gruposPorAQ(col.itens)),
      [group],
      ...colunasDestino.flatMap(col => gruposPorAQ(col.itens)),
    ];

    // Dedup por loteId — um lote pode ter sido encontrado tanto do lado da
    // origem quanto do destino (ciclo real, ex. AQ015→016→017→015); fica só
    // na 1ª coluna em que aparece.
    const jaPosicionado = new Set<string>();
    const cardsPorLoteId = new Map<string, CardInfo[]>();
    let colunaIndex = 0;
    for (const grupos of todasColunas) {
      const novos = grupos.filter(g => !jaPosicionado.has(g.loteId));
      if (novos.length === 0) continue;
      novos.forEach(g => jaPosicionado.add(g.loteId));
      const cardsDaColuna = novos.flatMap(g => {
        const cards = cardsDoGrupo(g);
        cardsPorLoteId.set(g.loteId, cards);
        return cards;
      });
      montarColuna(cardsDaColuna, colunaIndex, onAbrirDetalhes, nodes);
      colunaIndex++;
    }

    // Setas pela relação REAL do grafo (AQ_RECEBE_DE), não por coluna vizinha
    // — só liga dois grupos se a AQ de um realmente recebe da AQ do outro,
    // então Prensagem Fria e Colagem da Borda (irmãs, sem ligação direta
    // entre si) nunca ganham uma seta uma pra outra, só cada uma com o
    // Recobrimento que as originou de verdade.
    const todosOsGrupos = [...cardsPorLoteId.values()].map(cards => cards[0].group);
    for (const alvo of todosOsGrupos) {
      if (!alvo.currentAQ) continue;
      const origensValidas = new Set(AQ_RECEBE_DE[alvo.currentAQ] ?? []);
      if (origensValidas.size === 0) continue;
      for (const possivelOrigem of todosOsGrupos) {
        if (possivelOrigem.loteId === alvo.loteId) continue;
        if (!possivelOrigem.currentAQ || !origensValidas.has(possivelOrigem.currentAQ)) continue;
        const idsOrigem = cardsPorLoteId.get(possivelOrigem.loteId)!.map(c => c.id);
        const idsAlvo = cardsPorLoteId.get(alvo.loteId)!.map(c => c.id);
        for (const source of idsOrigem) {
          for (const target of idsAlvo) {
            edges.push({ id: `${source}->${target}`, source, target, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
          }
        }
      }
    }

    return { nodes, edges };
  }, [group, cadeia, onAbrirDetalhes]);

  // `fitView` (prop declarativa) só enquadra na 1ª renderização — como a
  // cadeia completa chega de forma assíncrona (origens/destinos aparecem
  // DEPOIS do card "atual" já estar na tela), os novos cards ficavam fora do
  // enquadramento inicial (existiam no grafo, só não apareciam na área
  // visível). Reenquadra manualmente sempre que o conjunto de nós muda.
  useEffect(() => {
    void fitView({ duration: 300, padding: 0.2 });
  }, [nodes, fitView]);

  return (
    <ReactFlow
      className="aq-flow-map"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// Fluxograma da cadeia (origem(ns) → atual → destino(s)) — mesmo React Flow
// (mover/zoom/controles) do "Fluxograma consolidado" do mapa, só que com nós
// simples em card (AQ, data, quantidade, produto) em vez do grafo geral de AQs.
export function CadeiaFluxogramaCards({ group, onAbrirDetalhes }: CadeiaFluxogramaCardsProps) {
  const { cadeia, cadeiaLoading } = useDetalhesDoLote(group);

  if (!group) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Fluxograma da cadeia</CardTitle>
        {cadeiaLoading && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <SpinnerCustom className="h-3 w-3" /> Rastreando cadeia completa...
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[560px] rounded-lg border border-border overflow-hidden">
          <ReactFlowProvider>
            <CadeiaFluxogramaInner group={group} cadeia={cadeia} onAbrirDetalhes={onAbrirDetalhes} />
          </ReactFlowProvider>
        </div>
      </CardContent>
    </Card>
  );
}
