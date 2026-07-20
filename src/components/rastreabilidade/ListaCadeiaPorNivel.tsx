"use client";

import { AlertTriangle } from "lucide-react";
import { agruparPorNivel, fmtData, labelDoLote, pecasDoGrupo, type CadeiaNode, type LoteGroup } from "./aqSearch";

/** Lista de lotes de uma cadeia (origem ou destino), agrupada por nível de profundidade — "1º nível", "2º nível"... */
export function ListaCadeiaPorNivel({
  nodes, direcao, onAbrirLote,
}: {
  nodes: CadeiaNode[];
  direcao: "origem" | "destino";
  onAbrirLote: (group: LoteGroup) => void;
}) {
  if (nodes.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
  const niveis = agruparPorNivel(nodes);
  return (
    <div className="space-y-2.5">
      {niveis.map(({ profundidade, itens }) => (
        <div key={profundidade}>
          <p className="text-[10px] text-muted-foreground/80 mb-1">
            {profundidade}º nível {direcao === "origem" ? "antes" : "depois"}
          </p>
          <div className="space-y-1">
            {itens.map(({ group: g }) => pecasDoGrupo(g).map((peca) => (
              <button
                key={`${g.loteId}::${peca.valor}`}
                onClick={() => onAbrirLote(g)}
                className="w-full text-left flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs hover:bg-muted/30"
              >
                <span className="flex flex-col items-start min-w-0">
                  <span className="flex items-center gap-1 font-mono font-semibold">
                    {labelDoLote(g, peca.valor)}
                    {peca.suspeita && (
                      <span title="Peça com menos dígitos que as demais do mesmo lote — possível erro de digitação, sem rastreamento automático">
                        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground/80 truncate max-w-[220px]">{g.produto ?? "Produto não informado"}</span>
                </span>
                <span className="text-muted-foreground shrink-0">{g.currentAQ ?? "—"} • {fmtData(g.ultimaData)}</span>
              </button>
            )))}
          </div>
        </div>
      ))}
    </div>
  );
}
