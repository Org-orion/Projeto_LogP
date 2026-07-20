// ═══════════════════════════════════════════════════════════════════════════════
// Layout do mapa de AQs — calculado automaticamente com dagre.
//
// Tentativa anterior era um heurístico manual (barycenter, por bloco/coluna
// fixa) — não escalou bem: com 77 conexões, linhas passavam por cima dos
// cards mesmo aumentando o espaçamento manualmente (confirmado com feedback
// visual real). Dagre é a biblioteca padrão pra esse problema (layout de
// grafo em camadas — "Sugiyama") e evita sobreposição de nó/aresta de forma
// muito mais robusta do que ajustar posições à mão.
//
// Roda 1x a nível de módulo sobre o grafo inteiro (AQ_GRAPH, incluindo nós
// fora do fluxo oficial como AQ040) — todo nó já sai com posição definida,
// sem precisar de um fallback separado pra "nós fantasma".
// ═══════════════════════════════════════════════════════════════════════════════

import dagre from "@dagrejs/dagre";
import { AQ_GRAPH } from "./aqGraph";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 56;

function buildLayoutPositions(): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 110, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of AQ_GRAPH.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of AQ_GRAPH.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of AQ_GRAPH.nodes) {
    const pos = g.node(node.id);
    // Dagre retorna o CENTRO do nó; React Flow posiciona pelo canto
    // superior-esquerdo — ajusta subtraindo metade da largura/altura.
    positions[node.id] = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
  }
  return positions;
}

export const AQ_LAYOUT_POSITIONS: Record<string, { x: number; y: number }> = buildLayoutPositions();

/** Fallback defensivo — todo nó de AQ_GRAPH já recebe posição de dagre acima;
 * só é usado se algum nó novo aparecer fora do grafo calculado. */
export function ghostNodePosition(index: number): { x: number; y: number } {
  return { x: index * 220, y: 1200 };
}
