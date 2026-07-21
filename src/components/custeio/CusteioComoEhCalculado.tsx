"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SpinnerCustom } from "@/components/ui/spinner";
import { useCusteioDocumentacaoMotor } from "@/hooks/useCusteioDocumentacaoMotor";
import { resolveCategoriaCor } from "./custeioColors";
import { fmtPct } from "./format";
import type { Componente, RegraConsumo } from "@/lib/custeio-motor/types";

const LABEL_COMPONENTE: Record<Componente, string> = { porta: "Porta", batente: "Batente", alizar: "Alizar", kit: "Kit" };

function descreverComoCalcula(regra: RegraConsumo): string {
  if (regra.tipo_valor === "fixo") return `Valor fixo: ${regra.valor_fixo ?? 0}${regra.unidade ? ` ${regra.unidade}` : ""}`;
  if (regra.tipo_valor === "formula") return regra.formula ?? "";
  return `Busca em ${regra.lookup_tabela ?? "?"}${regra.lookup_chave ? ` (chave: ${regra.lookup_chave})` : ""}`;
}

function TabelaRegrasComponente({ regras }: { regras: RegraConsumo[] }) {
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, RegraConsumo[]>();
    for (const r of regras) {
      const lista = mapa.get(r.categoria) ?? [];
      lista.push(r);
      mapa.set(r.categoria, lista);
    }
    return [...mapa.entries()];
  }, [regras]);

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Quando se aplica</TableHead>
            <TableHead>Como calcula</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {porCategoria.map(([categoria, itens]) => (
            <Fragment key={categoria}>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={5} className="font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: resolveCategoriaCor(categoria).light }} />
                    {categoria}
                  </span>
                </TableCell>
              </TableRow>
              {itens.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 font-medium">{r.item}</TableCell>
                  <TableCell className="text-muted-foreground">{r.condicao || "Sempre"}</TableCell>
                  <TableCell className="font-mono text-xs">{descreverComoCalcula(r)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.unidade ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.observacao || "—"}</TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CusteioComoEhCalculado() {
  const { dados, loading } = useCusteioDocumentacaoMotor();
  const [componente, setComponente] = useState<Componente>("porta");

  const regrasComponente = useMemo(
    () => dados.regras.filter((r) => r.componente === componente),
    [dados.regras, componente],
  );
  const excecoesComponente = useMemo(
    () => dados.overheadExcecoes.filter((e) => e.componente === componente),
    [dados.overheadExcecoes, componente],
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><SpinnerCustom /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ficha técnica — {LABEL_COMPONENTE[componente]}</CardTitle>
            <CardDescription>Toda regra de consumo cadastrada pra esse componente, categoria por categoria.</CardDescription>
          </div>
          <Select value={componente} onValueChange={(v) => setComponente(v as Componente)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="porta">Porta</SelectItem>
              <SelectItem value="batente">Batente</SelectItem>
              <SelectItem value="alizar">Alizar</SelectItem>
              <SelectItem value="kit">Kit</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <TabelaRegrasComponente regras={regrasComponente} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overhead (Custos Gerais) — DRE da fábrica</CardTitle>
          <CardDescription>
            % sobre o faturamento total, ponderado pelo fator de rateio do componente selecionado ({LABEL_COMPONENTE[componente]}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">% Faturamento</TableHead>
                  <TableHead>Escala pelo fator?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.overheadCategorias.map((c) => (
                  <TableRow key={c.categoria}>
                    <TableCell className="font-medium">{c.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(c.percentual_faturamento * 100)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{c.escala_padrao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {excecoesComponente.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Exceções específicas de {LABEL_COMPONENTE[componente]}</p>
              <div className="space-y-1.5 text-sm">
                {excecoesComponente.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-md border p-2">
                    <span className="text-muted-foreground">
                      <Badge variant="outline" className="mr-2">{e.categoria}</Badge>
                      {e.tipo_excecao.replace(/_/g, " ")}
                      {e.condicao && ` — se ${e.condicao}`}
                    </span>
                    {e.valor !== null && <span className="tabular-nums">×{e.valor}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceções do consolidador</CardTitle>
          <CardDescription>
            Diferenças conhecidas entre a soma dos 4 componentes e o total do Kit consolidado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {dados.consolidacaoExcecoes.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-md border p-2">
              <div>
                <p>{e.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  Origem: {e.componente_origem} · Item: {e.item} · Condição: {e.condicao || "sempre"}
                </p>
              </div>
              <Badge variant={e.ativo ? "default" : "outline"}>{e.ativo ? "Ativa" : "Desativada"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
