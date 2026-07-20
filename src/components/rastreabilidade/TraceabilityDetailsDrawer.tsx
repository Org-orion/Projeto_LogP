"use client";

import { ArrowLeft, ArrowRight, Map as MapIcon, FileText, Download } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QualityStatusBadge } from "@/components/qualidade/QualityStatusBadge";
import { AQ_RECEBE_DE } from "./aqConfig";
import { AQ_EMITS_TO } from "./aqGraph";
import { classificarStatus, fmtData, labelDoLote, type CadeiaCompleta, type LoteGroup } from "./aqSearch";
import { ListaCadeiaPorNivel } from "./ListaCadeiaPorNivel";

interface TraceabilityDetailsDrawerProps {
  group: LoteGroup | null;
  origins: LoteGroup[];
  children: LoteGroup[];
  cadeia: CadeiaCompleta | null;
  cadeiaLoading: boolean;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAbrirMapa: (group: LoteGroup) => void;
  onAbrirLote: (group: LoteGroup) => void;
}

function ResumoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

export function TraceabilityDetailsDrawer({
  group, origins, children, cadeia, cadeiaLoading, loading, open, onOpenChange, onAbrirMapa, onAbrirLote,
}: TraceabilityDetailsDrawerProps) {
  const emiteParaOfficial = group?.currentAQ ? (AQ_EMITS_TO[group.currentAQ] ?? []) : [];
  const recebeDeOfficial = group?.currentAQ ? (AQ_RECEBE_DE[group.currentAQ] ?? []) : [];
  const totalConforme = group?.totalConf ?? 0;
  const totalNC = group?.records.reduce((s, r) => s + (Number(r.qtd_nao_conforme_1) || 0), 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading || !group ? (
          <div className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded-md bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{labelDoLote(group)}</SheetTitle>
              <SheetDescription>
                {group.currentAQ ? `${group.currentAQ} — ${group.currentEtapa}` : "AQ não identificada"}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6 space-y-5">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <ResumoItem label="Produto" value={group.produto} />
                <ResumoItem label="Status" value={<QualityStatusBadge kind="conformidade" status={classificarStatus(group)} />} />
                <ResumoItem label="Data / hora" value={fmtData(group.ultimaData)} />
                <ResumoItem label="Quantidade conforme" value={totalConforme.toLocaleString("pt-BR")} />
                <ResumoItem label="Quantidade não conforme" value={totalNC.toLocaleString("pt-BR")} />
                <ResumoItem label="Cliente" value={group.cliente} />
                <ResumoItem label="Fornecedor" value={group.fornecedor} />
              </div>

              {/* Recebe de / Emite para */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Recebe de
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recebeDeOfficial.length > 0
                      ? recebeDeOfficial.map(aq => <Badge key={aq} variant="outline" className="font-mono text-[10px]">{aq}</Badge>)
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> Emite para
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {emiteParaOfficial.length > 0
                      ? emiteParaOfficial.map(aq => <Badge key={aq} variant="outline" className="font-mono text-[10px]">{aq}</Badge>)
                      : <span className="text-xs text-muted-foreground">Saída final</span>}
                  </div>
                </div>
              </div>

              {/* Movimentações — cadeia completa de origem/destino (todos os
                  níveis), não só o passo direto. Enquanto ainda carrega,
                  mostra o 1º passo (já disponível) como feedback imediato. */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Movimentações</p>
                  {cadeiaLoading && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground/40 border-t-transparent animate-spin" />
                      Rastreando cadeia completa...
                    </span>
                  )}
                </div>
                {(() => {
                  const nodosOrigem = cadeia ? cadeia.origens : origins.map(g => ({ group: g, profundidade: 1 }));
                  const nodosDestino = cadeia ? cadeia.destinos : children.map(g => ({ group: g, profundidade: 1 }));
                  if (nodosOrigem.length === 0 && nodosDestino.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">Nenhuma movimentação de lote encontrada no banco.</p>;
                  }
                  return (
                    <div className="space-y-3">
                      <ListaCadeiaPorNivel nodes={nodosOrigem} direcao="origem" onAbrirLote={onAbrirLote} />
                      <ListaCadeiaPorNivel nodes={nodosDestino} direcao="destino" onAbrirLote={onAbrirLote} />
                    </div>
                  );
                })()}
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button className="gap-1.5" onClick={() => onAbrirMapa(group)}>
                  <MapIcon className="h-3.5 w-3.5" /> Visualizar mapa completo
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={!group.currentAQ}>
                    <FileText className="h-3.5 w-3.5" /> Abrir AQ
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Exportar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
