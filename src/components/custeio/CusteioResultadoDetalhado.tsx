"use client";

import { Fragment, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { Layers, Boxes, PackageCheck, ListChecks } from "lucide-react";
import { fmtBRL, fmtPct } from "./format";
import { resolveCategoriaCor } from "./custeioColors";
import type { Componente, InformacoesDerivadas } from "@/lib/custeio-motor/types";

interface ItemLinha {
  categoria: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  custo: number;
  percentual: number;
}

interface ResultadoComponenteView {
  itens: ItemLinha[];
  custoDireto: number;
  custoOverhead: number;
  custoTotal: number;
  overheadDetalhe: { categoria: string; percentualEfetivo: number; valor: number }[];
}

export interface ResultadoKitCompletoView {
  porta: ResultadoComponenteView;
  batente: ResultadoComponenteView;
  alizar: ResultadoComponenteView;
  kit: ResultadoComponenteView;
  somaComponentes: number;
  totalConsolidado: number;
  ajustesAplicados: { descricao: string; valorExcluido: number }[];
  informacoes: InformacoesDerivadas;
}

const LABEL: Record<Componente, string> = { porta: "Porta", batente: "Batente", alizar: "Alizar", kit: "Kit" };

function TabelaComponente({ resultado }: { resultado: ResultadoComponenteView }) {
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, ItemLinha[]>();
    for (const item of resultado.itens) {
      const lista = mapa.get(item.categoria) ?? [];
      lista.push(item);
      mapa.set(item.categoria, lista);
    }
    return [...mapa.entries()];
  }, [resultado.itens]);

  return (
    <div className="max-h-[480px] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Linha de Custo / Item</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Unit.</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {porCategoria.map(([categoria, itens]) => {
            const subtotal = itens.reduce((s, i) => s + i.custo, 0);
            return (
              <Fragment key={categoria}>
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: resolveCategoriaCor(categoria).light }} />
                    {categoria}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">{fmtBRL(subtotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(subtotal / resultado.custoTotal * 100)}</TableCell>
                </TableRow>
                {itens.map((item) => (
                  <TableRow key={`${categoria}-${item.item}`}>
                    <TableCell className="pl-6 text-muted-foreground">{item.item}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(item.valorUnitario)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(item.custo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(item.percentual)}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            );
          })}

          <TableRow className="bg-muted/50 font-medium">
            <TableCell className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: resolveCategoriaCor("Custos Gerais").light }} />
              Custos Gerais
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-right tabular-nums">{fmtBRL(resultado.custoOverhead)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtPct(resultado.custoOverhead / resultado.custoTotal * 100)}</TableCell>
          </TableRow>
          {resultado.overheadDetalhe.filter((d) => d.valor !== 0).map((d) => (
            <TableRow key={d.categoria}>
              <TableCell className="pl-6 text-muted-foreground">{d.categoria}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right tabular-nums">{fmtBRL(d.valor)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(d.valor / resultado.custoTotal * 100)}</TableCell>
            </TableRow>
          ))}

          <TableRow className="border-t-2 font-semibold">
            <TableCell>Custo de Produção</TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-right tabular-nums">{fmtBRL(resultado.custoTotal)}</TableCell>
            <TableCell className="text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function CusteioResultadoKpis({ resultado }: { resultado: ResultadoKitCompletoView }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard icon={PackageCheck} title="Total Consolidado" value={resultado.totalConsolidado} valueFormatter={fmtBRL} />
      <KpiCard icon={Layers} title="Soma dos Componentes" value={resultado.somaComponentes} valueFormatter={fmtBRL} />
      <KpiCard icon={Boxes} title="Custo do Kit (extras)" value={resultado.kit.custoTotal} valueFormatter={fmtBRL} />
      <KpiCard icon={ListChecks} title="Ajustes do Consolidador" value={resultado.ajustesAplicados.length} unit="regras" />
    </div>
  );
}

const INFO_LABEL: Record<keyof InformacoesDerivadas, string> = {
  linha: "Linha",
  padrao: "Padrão",
  acabamento: "Acabamento",
  tipoRecobrimento: "Tipo de Recobrimento",
  fitaBorda: "Fita de Borda",
  borracha: "Borracha",
};

function CusteioInformacoesDerivadas({ informacoes }: { informacoes: InformacoesDerivadas }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Informações derivadas da configuração</CardTitle>
        <CardDescription>Calculadas automaticamente — não são escolhidas, só refletem o que foi selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(INFO_LABEL) as (keyof InformacoesDerivadas)[]).map((chave) => (
            <div key={chave}>
              <dt className="text-xs text-muted-foreground">{INFO_LABEL[chave]}</dt>
              <dd className="font-medium">{informacoes[chave] || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function CusteioResultadoDetalhado({ resultado }: { resultado: ResultadoKitCompletoView }) {
  return (
    <div className="space-y-4">
      <CusteioInformacoesDerivadas informacoes={resultado.informacoes} />

      {resultado.ajustesAplicados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por que o total consolidado é diferente da soma dos componentes</CardTitle>
            <CardDescription>
              Soma pura: {fmtBRL(resultado.somaComponentes)} → aplicando as regras abaixo: {fmtBRL(resultado.totalConsolidado)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {resultado.ajustesAplicados.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{a.descricao}</span>
                <span className="tabular-nums text-red-600">−{fmtBRL(a.valorExcluido)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["porta", "batente", "alizar", "kit"] as Componente[]).map((c) => (
          <Card key={c}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{LABEL[c]} — {fmtBRL(resultado[c].custoTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <TabelaComponente resultado={resultado[c]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
