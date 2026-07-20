"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow, ReactFlowProvider, Controls, MiniMap, Background, BackgroundVariant,
  MarkerType, useReactFlow, type Node, type Edge, type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./aqFlowTheme.css";
import { AqNode, type AqNodeData } from "./AqNode";
import { AQ_GRAPH, AQ_EMITS_TO, type AqFinding } from "./aqGraph";
import { AQ_RECEBE_DE } from "./aqConfig";
import { AQ_LAYOUT_POSITIONS, ghostNodePosition } from "./aqLayout";

const nodeTypes = { aq: AqNode };

export interface AqFlowMapProps {
  /** AQs percorridas pelo lote pesquisado (destaca o caminho). Omitir na visão geral. */
  highlightPath?: string[];
  /** Achado de validação atualmente focado (via "Destacar no mapa"). */
  focusedFinding?: AqFinding | null;
  /** Notifica o componente pai quando um nó é clicado (ex.: abrir detalhes). */
  onNodeSelect?: (aqId: string | null) => void;
  className?: string;
}

function buildFlowElements(highlightPath?: string[], focusedFinding?: AqFinding | null, selected?: string | null) {
  const pathSet = new Set(highlightPath ?? []);
  const findingSet = new Set(focusedFinding?.aqsEnvolvidos ?? []);
  const hasHighlight = pathSet.size > 0 || findingSet.size > 0;

  const selectedRelated = new Set<string>();
  if (selected) {
    selectedRelated.add(selected);
    (AQ_RECEBE_DE[selected] ?? []).forEach(id => selectedRelated.add(id));
    (AQ_EMITS_TO[selected] ?? []).forEach(id => selectedRelated.add(id));
  }

  let ghostIndex = 0;
  const nodes: Node<AqNodeData>[] = AQ_GRAPH.nodes.map(n => {
    const pos = AQ_LAYOUT_POSITIONS[n.id] ?? ghostNodePosition(ghostIndex++);
    const emCaminho = pathSet.has(n.id);
    const emAchado = findingSet.has(n.id);
    const emSelecao = selected ? selectedRelated.has(n.id) : false;
    const destacado = emCaminho || emAchado || emSelecao;
    return {
      id: n.id,
      type: "aq",
      position: pos,
      data: {
        aqId: n.id,
        nome: n.nome,
        subprocesso: n.subprocesso,
        emCaminho,
        emAchado,
        esmaecido: (hasHighlight || !!selected) && !destacado,
      },
    };
  });

  const edges: Edge[] = AQ_GRAPH.edges.map(e => {
    const emCaminho = pathSet.has(e.source) && pathSet.has(e.target);
    const emAchado = findingSet.has(e.source) && findingSet.has(e.target);
    const emSelecao = !!selected && selectedRelated.has(e.source) && selectedRelated.has(e.target);
    const destacado = emCaminho || emAchado || emSelecao;
    return {
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        opacity: (hasHighlight || selected) && !destacado ? 0.25 : 1,
        strokeWidth: destacado ? 2.5 : 1.5,
      },
    };
  });

  return { nodes, edges };
}

function AqFlowMapInner({ highlightPath, focusedFinding, onNodeSelect, className }: AqFlowMapProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => buildFlowElements(highlightPath, focusedFinding, selected),
    [highlightPath, focusedFinding, selected]
  );

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelected(prev => {
      const next = prev === node.id ? null : node.id;
      onNodeSelect?.(next);
      return next;
    });
  }, [onNodeSelect]);

  // "Destacar no mapa": ao focar um achado, centraliza a visão nas AQs envolvidas.
  useEffect(() => {
    if (focusedFinding && focusedFinding.aqsEnvolvidos.length > 0) {
      void fitView({ nodes: focusedFinding.aqsEnvolvidos.map(id => ({ id })), duration: 400, padding: 0.3 });
    }
  }, [focusedFinding, fitView]);

  return (
    <div className={className}>
      <ReactFlow
        className="aq-flow-map"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={() => { setSelected(null); onNodeSelect?.(null); }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  );
}

/** Wrapper com ReactFlowProvider — use este export fora do módulo. */
export function AqFlowMap(props: AqFlowMapProps) {
  return (
    <ReactFlowProvider>
      <AqFlowMapInner {...props} />
    </ReactFlowProvider>
  );
}
