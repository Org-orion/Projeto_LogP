// ═══════════════════════════════════════════════════════════════════════════════
// Grafo de AQs — funções puras derivadas da config estática (aqConfig.ts).
//
// Não depende de Supabase nem de React: pode ser calculado uma única vez a
// nível de módulo (AQ_GRAPH/AQ_FINDINGS) e reutilizado tanto pelo mapa visual
// (AqFlowMap.tsx) quanto pelo card de achados (ValidationFindingsCard.tsx).
//
// IMPORTANTE (regra de domínio): AQ_RECEBE_DE (aqConfig.ts) é o dado
// PRIMÁRIO — o que está escrito na ficha física de cada AQ. AQ_EMITS_TO
// abaixo é sempre DERIVADO invertendo AQ_RECEBE_DE, nunca o contrário.
// ═══════════════════════════════════════════════════════════════════════════════

import { AQ_COLUMN_MAP, AQ_RECEBE_DE, AQ_STAGE_MAP, type SubprocessoKey } from "./aqConfig";

export interface AqNode {
  id: string;
  nome: string;
  subprocesso: SubprocessoKey | null;
}

export interface AqEdge {
  source: string;
  target: string;
}

export interface AqGraph {
  nodes: AqNode[];
  edges: AqEdge[];
}

export type AqFindingTipo = "ciclo" | "sem_destino" | "fantasma" | "origem_inexistente" | "componente_conexo";
export type AqFindingSeveridade = "alta" | "media" | "baixa";

export interface AqFinding {
  id: string;
  tipo: AqFindingTipo;
  severidade: AqFindingSeveridade;
  titulo: string;
  descricao: string;
  aqsEnvolvidos: string[];
}

/**
 * Monta o grafo de AQs a partir de AQ_RECEBE_DE (fonte primária — "ITEM / Nº
 * DOS LOTES DE ORIGEM" de cada ficha) + AQ_STAGE_MAP (AQs oficialmente
 * cadastradas) + AQ_COLUMN_MAP (colunas reais do banco, captura órfãos com
 * dado gravado mas fora do fluxo oficial).
 *
 * As arestas são a inversão de AQ_RECEBE_DE: se a ficha da AQ X lista "Y"
 * como lote de origem, a aresta vai de Y → X (Y emite pra X). Nunca inventa
 * conexão — cada aresta corresponde exatamente a uma entrada de AQ_RECEBE_DE.
 */
export function buildAqGraph(): AqGraph {
  const nodeIds = new Set<string>();
  Object.keys(AQ_STAGE_MAP).forEach(id => nodeIds.add(id));
  Object.entries(AQ_RECEBE_DE).forEach(([aq, origens]) => {
    nodeIds.add(aq);
    origens.forEach(origem => nodeIds.add(origem));
  });
  Object.values(AQ_COLUMN_MAP).forEach(aq => nodeIds.add(aq));

  const nodes: AqNode[] = Array.from(nodeIds)
    .sort()
    .map(id => ({
      id,
      nome: AQ_STAGE_MAP[id]?.nome ?? id,
      subprocesso: AQ_STAGE_MAP[id]?.subprocesso ?? null,
    }));

  const edges: AqEdge[] = Object.entries(AQ_RECEBE_DE).flatMap(([aq, origens]) =>
    origens.map(origem => ({ source: origem, target: aq }))
  );

  return { nodes, edges };
}

/** Agrupa as arestas por origem — é o "emite_para" derivado (nunca hardcoded). */
export function computeEmitsTo(graph: AqGraph): Record<string, string[]> {
  const emitsTo: Record<string, string[]> = {};
  for (const node of graph.nodes) emitsTo[node.id] = [];
  for (const edge of graph.edges) {
    (emitsTo[edge.source] ??= []).push(edge.target);
  }
  return emitsTo;
}

/**
 * Nós fantasma: existem como coluna real do banco (AQ_COLUMN_MAP) mas não
 * fazem parte do fluxo oficial — não estão em AQ_STAGE_MAP e não têm nenhuma
 * aresta (nem de entrada, nem de saída) em AQ_RECEBE_DE.
 * Distinto de "origem_inexistente": aqui o nó nunca é citado por ninguém,
 * lá o nó É citado como origem mas não existe cadastro (caso AQ040).
 */
export function findGhostNodes(graph: AqGraph): AqFinding[] {
  const emAlgumaAresta = new Set<string>();
  for (const edge of graph.edges) {
    emAlgumaAresta.add(edge.source);
    emAlgumaAresta.add(edge.target);
  }

  return graph.nodes
    .filter(n => n.subprocesso === null && !emAlgumaAresta.has(n.id))
    .map(n => ({
      id: `fantasma:${n.id}`,
      tipo: "fantasma" as const,
      severidade: "baixa" as const,
      titulo: `${n.id} não está integrado ao fluxo`,
      descricao: `${n.id} tem coluna própria no banco (dado real é gravado), mas não aparece no fluxo oficial nem tem conexão declarada com nenhuma outra AQ.`,
      aqsEnvolvidos: [n.id],
    }));
}

/**
 * Origem citada mas não cadastrada: uma AQ aparece na lista de "lotes de
 * origem" de outra (AQ_RECEBE_DE), mas não tem entrada própria em
 * AQ_STAGE_MAP — é uma referência quebrada na ficha, não deve ser omitida.
 * Caso real conhecido: AQ020 cita "AQ040" (Esquadrejadeira) como origem, mas
 * AQ040 não está oficialmente cadastrada no fluxo.
 */
export function findDanglingOrigins(graph: AqGraph): AqFinding[] {
  const naoCadastrados = graph.nodes.filter(n => n.subprocesso === null);
  const findings: AqFinding[] = [];

  for (const orfao of naoCadastrados) {
    const citantes = graph.edges.filter(e => e.source === orfao.id).map(e => e.target);
    if (citantes.length === 0) continue; // não é citado por ninguém — é caso de findGhostNodes, não este
    findings.push({
      id: `origem_inexistente:${orfao.id}`,
      tipo: "origem_inexistente",
      severidade: "alta",
      titulo: `${orfao.id} é citada como origem mas não está cadastrada`,
      descricao: `${citantes.join(", ")} ${citantes.length > 1 ? "citam" : "cita"} "${orfao.id}" como lote de origem, mas ${orfao.id} não tem cadastro oficial no fluxo. Confirme se é uma AQ que deveria existir ou um erro na ficha.`,
      aqsEnvolvidos: [orfao.id, ...citantes],
    });
  }

  return findings;
}

/**
 * Nós do fluxo oficial sem nenhuma aresta de saída — exceto a etapa de
 * expedição/montagem final, que é o fim esperado da linha. Não é
 * necessariamente um erro (ex.: AQ003 genuinamente não é citada como origem
 * por nenhuma outra AQ hoje) — é informativo, pra nunca esconder o caso.
 */
export function findNodesWithoutDestination(graph: AqGraph): AqFinding[] {
  const comSaida = new Set(graph.edges.map(e => e.source));

  return graph.nodes
    .filter(n => n.subprocesso !== null && n.subprocesso !== "expedicao" && !comSaida.has(n.id))
    .map(n => ({
      id: `sem_destino:${n.id}`,
      tipo: "sem_destino" as const,
      severidade: "media" as const,
      titulo: `${n.id} não emite para nenhuma AQ`,
      descricao: `${n.id} (${n.nome}) faz parte do fluxo oficial mas não é citada como origem por nenhuma outra AQ — "sem destino registrado", não necessariamente um erro. Confirme com a produção se o material segue para alguma etapa não documentada na ficha.`,
      aqsEnvolvidos: [n.id],
    }));
}

/** Componentes fortemente conexos (Tarjan) — cada um com >1 nó é um ciclo real. */
function stronglyConnectedComponents(nodeIds: string[], adj: Record<string, string[]>): string[][] {
  let counter = 0;
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    index.set(v, counter);
    lowlink.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj[v] ?? []) {
      if (!index.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodeIds) {
    if (!index.has(v)) strongConnect(v);
  }
  return sccs;
}

/** Menor ciclo dentro de um componente fortemente conexo (BFS a partir de cada membro). */
function shortestCycleWithin(members: string[], adj: Record<string, string[]>): string[] {
  const memberSet = new Set(members);
  let best: string[] | null = null;

  for (const start of members) {
    const prev = new Map<string, string>();
    const visited = new Set<string>([start]);
    const queue: string[] = [start];
    let head = 0;
    let closingNode: string | null = null;

    while (head < queue.length && !closingNode) {
      const cur = queue[head++];
      for (const next of adj[cur] ?? []) {
        if (!memberSet.has(next)) continue;
        if (next === start) { closingNode = cur; break; }
        if (!visited.has(next)) {
          visited.add(next);
          prev.set(next, cur);
          queue.push(next);
        }
      }
    }

    if (closingNode) {
      const path = [closingNode];
      let cur = closingNode;
      while (cur !== start) {
        cur = prev.get(cur)!;
        path.push(cur);
      }
      path.reverse(); // start → ... → closingNode
      // Em caso de empate (mais de um ciclo mínimo no mesmo componente —
      // acontece aqui: AQ015-AQ016-AQ017 e AQ015-AQ039-AQ017 têm o mesmo
      // tamanho), desempata de forma determinística pela chave ordenada,
      // pra sempre reportar o mesmo ciclo entre execuções.
      const key = [...path].sort().join(">");
      const bestKey = best ? [...best].sort().join(">") : null;
      if (!best || path.length < best.length || (path.length === best.length && key < bestKey!)) {
        best = path;
      }
    }
  }

  return best ?? members;
}

/**
 * Detecta ciclos via componentes fortemente conexos (Tarjan) — mais robusto
 * que marcar só o primeiro back-edge encontrado em uma DFS, que pode reportar
 * um caminho bem mais longo (e menos legível) do que o ciclo real mínimo
 * quando várias rotas se cruzam no mesmo cluster. Pra cada componente com
 * mais de um nó, reporta o MENOR ciclo dentro dele (o exemplo mais claro).
 * Caso real conhecido: AQ015 → AQ016 → AQ017 → AQ015. Qualquer travessia
 * recursiva do grafo (busca de origem/destino) precisa da mesma proteção
 * contra recursão infinita — nós já visitados no caminho atual interrompem
 * o ramo, exatamente como o SCC evita aqui.
 */
export function findCycles(graph: AqGraph): AqFinding[] {
  const nodeIds = graph.nodes.map(n => n.id);
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const edge of graph.edges) adj[edge.source]?.push(edge.target);

  const sccs = stronglyConnectedComponents(nodeIds, adj).filter(scc => scc.length > 1);

  return sccs.map(scc => {
    const ciclo = shortestCycleWithin(scc, adj);
    const caminho = [...ciclo, ciclo[0]];
    return {
      id: `ciclo:${[...ciclo].sort().join(">")}`,
      tipo: "ciclo" as const,
      severidade: "alta" as const,
      titulo: "Ciclo detectado no fluxo de AQs",
      descricao: `${caminho.join(" → ")} — confirmado como fluxo real (não erro de transcrição): a Destopadeira (AQ015) processa tanto sarrafo bruto quanto material já prensado por AQ017. Buscas recursivas de origem/destino precisam parar ao revisitar um nó já no caminho atual.`,
      aqsEnvolvidos: ciclo,
    };
  });
}

/**
 * Componente fortemente conexo completo (Tarjan) — complementa `findCycles`
 * (que só mostra o MENOR ciclo dentro do componente, o exemplo mais claro).
 * Aqui aparece o bloco inteiro: caso real conhecido, AQ015/AQ016/AQ017/AQ019/
 * AQ021/AQ039/AQ041/AQ042 formam um único componente de 8 nós mutuamente
 * alcançáveis (várias combinações de ciclo simples compartilham os mesmos
 * nós) — mostrar só "o" ciclo mínimo esconde que as outras 7 AQs também
 * estão dentro do mesmo bloco. Reportado à parte pra não obrigar quem só
 * quer ver um exemplo de ciclo a processar a lista inteira.
 */
export function findComponentesConexos(graph: AqGraph): AqFinding[] {
  const nodeIds = graph.nodes.map(n => n.id);
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const edge of graph.edges) adj[edge.source]?.push(edge.target);

  const sccs = stronglyConnectedComponents(nodeIds, adj).filter(scc => scc.length > 1);

  return sccs.map(scc => {
    const membros = [...scc].sort();
    return {
      id: `componente:${membros.join(">")}`,
      tipo: "componente_conexo" as const,
      severidade: "media" as const,
      titulo: `${membros.length} AQs formam um único bloco totalmente interligado`,
      descricao: `${membros.join(", ")} são mutuamente alcançáveis entre si (não é "um" ciclo, são vários ciclos simples diferentes compartilhando os mesmos nós). Recomenda-se validar com quem opera essas máquinas se todas as ligações internas do bloco são reais, ou se alguma é erro de preenchimento numa ficha.`,
      aqsEnvolvidos: membros,
    };
  });
}

const SEVERITY_ORDER: Record<AqFindingSeveridade, number> = { alta: 0, media: 1, baixa: 2 };

export function runValidation(graph: AqGraph): AqFinding[] {
  return [
    ...findCycles(graph),
    ...findComponentesConexos(graph),
    ...findDanglingOrigins(graph),
    ...findNodesWithoutDestination(graph),
    ...findGhostNodes(graph),
  ].sort((a, b) => SEVERITY_ORDER[a.severidade] - SEVERITY_ORDER[b.severidade]);
}

export const AQ_GRAPH = buildAqGraph();
export const AQ_EMITS_TO = computeEmitsTo(AQ_GRAPH);
export const AQ_FINDINGS = runValidation(AQ_GRAPH);
