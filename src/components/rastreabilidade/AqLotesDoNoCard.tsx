"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X, MapIcon, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpinnerCustom } from "@/components/ui/spinner";
import { EmptyState } from "@/components/production/EmptyState";
import { Inbox } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/configuracoes/StatusPill";
import { AQ_EMITS_TO } from "@/components/rastreabilidade/aqGraph";
import { AQ_STAGE_MAP } from "@/components/rastreabilidade/aqConfig";
import {
  buscarLotesPorAQ, calcularQtdConsumida, classificarStatusLote, fmtData, getOrigensDoRegistro, labelDoLote, maquinasDoGrupo, pecasDoGrupo,
  type LoteGroup, type PecaComposta, type StatusLote,
} from "@/components/rastreabilidade/aqSearch";

const STATUS_INFO: Record<StatusLote, { label: string; tone: StatusTone }> = {
  disponivel:             { label: "Disponível",              tone: "success" },
  parcialmente_consumido: { label: "Parcialmente consumido",  tone: "info" },
  totalmente_consumido:   { label: "Totalmente consumido",    tone: "neutral" },
  bloqueado:              { label: "Bloqueado",                tone: "destructive" },
  expedido:               { label: "Expedido",                 tone: "warning" },
};

/** Origem real (não estática) de um grupo — união das origens encontradas nos registros do próprio grupo, sem custo de rede. */
function origensReaisDoGrupo(group: LoteGroup): string[] {
  const codigos = new Set<string>();
  for (const rec of group.records) {
    for (const origem of getOrigensDoRegistro(rec, group.currentAQ)) codigos.add(origem.aqCode);
  }
  return [...codigos];
}

const PAGE_SIZE_OPTIONS = [5, 10, 25];

export interface AqLotesDoNoCardProps {
  aqCode: string;
  onVerDetalhes: (group: LoteGroup) => void;
  onVerRastreabilidadeCompleta: (loteId: string) => void;
  onFechar: () => void;
}

// Painel "Lotes da AQ" — aparece ao clicar num card do fluxograma. Mostra os
// lotes já gerados naquela AQ (tabela paginada) e, ao clicar num lote, um
// painel de detalhe ao lado. "Qtd disponível"/status são estimativas (ver
// aqSearch.ts: calcularQtdConsumida/classificarStatusLote) — o banco não
// registra quanto de cada lote de origem foi efetivamente consumido, só QUE
// foi, por isso aparecem marcados como aproximação ("~").
export function AqLotesDoNoCard({ aqCode, onVerDetalhes, onVerRastreabilidadeCompleta, onFechar }: AqLotesDoNoCardProps) {
  const [lotes, setLotes] = useState<LoteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [consumoPorLote, setConsumoPorLote] = useState<Map<string, number>>(new Map());
  const [consumoCarregando, setConsumoCarregando] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteGroup | null>(null);
  const [selectedPeca, setSelectedPeca] = useState<PecaComposta | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setLotes([]);
    setConsumoPorLote(new Map());
    setPagina(1);
    setSelectedLote(null);
    setSelectedPeca(null);
    buscarLotesPorAQ(aqCode).then((grupos) => {
      if (cancelado) return;
      setLotes(grupos);
      setLoading(false);
    });
    return () => { cancelado = true; };
  }, [aqCode]);

  const totalPaginas = Math.max(1, Math.ceil(lotes.length / pageSize));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const lotesDaPagina = useMemo(
    () => lotes.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize),
    [lotes, paginaAtual, pageSize]
  );
  // Uma linha da tabela vira N linhas quando o valor próprio do lote é
  // composto (a Seccionadora corta várias peças numa string só, ver
  // pecasDoGrupo) — cada peça pode ter seguido por um caminho diferente.
  const linhasDaPagina = useMemo(
    () => lotesDaPagina.flatMap(g => pecasDoGrupo(g).map(peca => ({ group: g, peca }))),
    [lotesDaPagina]
  );

  // Calcula a "Qtd consumida" (estimativa) só dos lotes visíveis na página
  // atual — evita disparar uma busca por lote pros até 200 lotes da AQ.
  useEffect(() => {
    const pendentes = lotesDaPagina.filter(g => !consumoPorLote.has(g.loteId));
    if (pendentes.length === 0) return;
    let cancelado = false;
    setConsumoCarregando(true);
    Promise.all(pendentes.map(async (g) => [g.loteId, await calcularQtdConsumida(g)] as const)).then((pares) => {
      if (cancelado) return;
      setConsumoPorLote(prev => new Map([...prev, ...pares]));
      setConsumoCarregando(false);
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesDaPagina]);

  const nomeAQ = AQ_STAGE_MAP[aqCode]?.nome ?? aqCode;
  const proximaEtapa = AQ_EMITS_TO[aqCode] ?? [];

  function renderStatus(group: LoteGroup) {
    const consumido = consumoPorLote.get(group.loteId);
    if (consumido === undefined) return <span className="text-xs text-muted-foreground">…</span>;
    const status = classificarStatusLote(group, consumido);
    const info = STATUS_INFO[status];
    return <StatusPill label={info.label} tone={info.tone} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Lotes da {aqCode} — {nomeAQ}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            "Qtd disponível" e "Status" são estimativas calculadas a partir dos lotes-filho encontrados no banco (~).
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onFechar}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32"><SpinnerCustom /></div>
        ) : lotes.length === 0 ? (
          <EmptyState icon={Inbox} title="Nenhum lote encontrado" description={`Não há registros com dados de ${aqCode} no banco.`} />
        ) : (
          <div className={`grid grid-cols-1 ${selectedLote ? "lg:grid-cols-3" : ""} gap-4`}>
            <div className={selectedLote ? "lg:col-span-2 space-y-3" : "space-y-3"}>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Lote</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd gerada</TableHead>
                      <TableHead>Qtd disponível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Gerado em</TableHead>
                      <TableHead className="hidden md:table-cell">Máquina</TableHead>
                      <TableHead className="hidden md:table-cell">Origem</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasDaPagina.map(({ group: g, peca }) => {
                      const consumido = consumoPorLote.get(g.loteId);
                      const disponivel = consumido === undefined ? null : Math.max(0, g.totalConf - consumido);
                      const origens = origensReaisDoGrupo(g);
                      const linhaSelecionada = selectedLote?.loteId === g.loteId && selectedPeca?.valor === peca.valor;
                      return (
                        <TableRow
                          key={`${g.loteId}::${peca.valor}`}
                          className={`cursor-pointer ${linhaSelecionada ? "bg-muted/40" : ""}`}
                          onClick={() => { setSelectedLote(g); setSelectedPeca(peca); }}
                        >
                          <TableCell className="font-mono text-xs font-semibold">
                            <span className="flex items-center gap-1">
                              {labelDoLote(g, peca.valor)}
                              {peca.suspeita && (
                                <span title="Peça com menos dígitos que as demais do mesmo lote — possível erro de digitação, sem rastreamento automático">
                                  <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{g.produto ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{g.totalConf}</TableCell>
                          <TableCell className="text-xs font-mono">{disponivel === null ? "…" : `~${disponivel}`}</TableCell>
                          <TableCell>{renderStatus(g)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs font-mono whitespace-nowrap">{fmtData(g.ultimaData)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{maquinasDoGrupo(g)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {origens.length === 0
                              ? <span className="text-xs text-muted-foreground">—</span>
                              : <div className="flex flex-wrap gap-1">{origens.map(o => <Badge key={o} variant="outline" className="font-mono text-[10px] px-1">{o}</Badge>)}</div>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalhes" onClick={(e) => { e.stopPropagation(); onVerDetalhes(g); }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver rastreabilidade completa" onClick={(e) => { e.stopPropagation(); onVerRastreabilidadeCompleta(g.loteId); }}>
                                <MapIcon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Mostrar</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPagina(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span>de {lotes.length} lotes {consumoCarregando && "· calculando estimativas..."}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" disabled={paginaAtual <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>Anterior</Button>
                  <span className="text-xs text-muted-foreground px-1.5">Página {paginaAtual} de {totalPaginas}</span>
                  <Button size="sm" variant="outline" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>Próxima</Button>
                </div>
              </div>
            </div>

            {selectedLote && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-semibold flex items-center gap-1">
                    {labelDoLote(selectedLote, selectedPeca?.valor)}
                    {selectedPeca?.suspeita && (
                      <span title="Peça com menos dígitos que as demais do mesmo lote — possível erro de digitação, sem rastreamento automático">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                      </span>
                    )}
                  </p>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setSelectedLote(null); setSelectedPeca(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Produto</p><p className="text-xs font-medium">{selectedLote.produto ?? "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Qtd gerada</p><p className="text-xs font-medium font-mono">{selectedLote.totalConf}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">AQ atual</p><Badge variant="outline" className="font-mono text-[10px] mt-0.5">{selectedLote.currentAQ ?? "—"}</Badge></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Máquina</p><p className="text-xs font-medium">{maquinasDoGrupo(selectedLote)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Gerado em</p><p className="text-xs font-medium font-mono">{fmtData(selectedLote.ultimaData)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Status</p><div className="mt-0.5">{renderStatus(selectedLote)}</div></div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Recebido de</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {origensReaisDoGrupo(selectedLote).length === 0
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : origensReaisDoGrupo(selectedLote).map(o => <Badge key={o} variant="outline" className="font-mono text-[10px]">{o}</Badge>)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Próxima etapa</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {proximaEtapa.length === 0
                        ? <span className="text-xs text-muted-foreground">Saída final</span>
                        : proximaEtapa.map(aq => <Badge key={aq} variant="outline" className="font-mono text-[10px]">{aq}</Badge>)}
                    </div>
                  </div>
                  <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase">Pedido</p><p className="text-xs font-medium">{selectedLote.pedido ?? "—"}</p></div>
                  <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase">Observações</p><p className="text-xs font-medium">{selectedLote.observacao ?? "—"}</p></div>
                </div>
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                  <Button size="sm" className="gap-1.5" onClick={() => onVerRastreabilidadeCompleta(selectedLote.loteId)}>
                    <MapIcon className="h-3.5 w-3.5" /> Ver rastreabilidade completa
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onVerDetalhes(selectedLote)}>
                    <Eye className="h-3.5 w-3.5" /> Ver detalhes do lote
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled>Histórico do lote</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
