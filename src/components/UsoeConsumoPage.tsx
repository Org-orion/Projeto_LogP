"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Factory, Package, Box, Layers, DollarSign, ChevronDown, Scissors } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ResumoRPC {
  maquina: string;
  produto_codigo: string;
  produto_descricao: string;
  produto_categoria: string;
  tipo_material: string;
  pecas: number;
  volume_unitario_m3: number;
  consumo_m3: number;
  padrao?: string | null;
}

interface PrecoProduto {
  codigo: string;
  descricao: string | null;
  preco_unitario: number | null;
  valor: number | null;
  dim_largura: number | null;
  dim_comprimento: number | null;
  dim_espessura: number | null;
}

interface RowMatEntrada {
  maquina: string;
  tipo_material: string | null;
  tipo_chapa: string | null;
  qtd_chapas: number | null;
  larg_recebido_cm: number | null;
  comp_recebido_cm: number | null;
  esp_recebido_mm: number | null;
  produto: string | null;
  produto_sobra: string | null;
  qtd_producao_1: number | null;
  qtd_producao_2: number | null;
  qtd_sobra: number | null;
  larg_sobra_cm: number | null;
  comp_sobra_cm: number | null;
  esp_sobra_mm: number | null;
}

interface ProdutoProduzido {
  nome: string;
  pecas: number;
  consumo_m3: number;
  custo: number;
}

interface LinhaMatCusto {
  maquina: string;
  tipo_material: string;
  descricao_produto: string;
  consumo_m3: number;
  preco_m3: number;
  custo_total: number;
  produtos_produzidos: ProdutoProduzido[];
}

interface LinhaConsumo {
  maquina: string;
  cod_produto: string;
  descricao: string;
  categoria: string;
  tipo_material: string;
  padrao: string | null;
  pecas: number;
  volume_unitario_m3: number;
  consumo_m3: number;
}

interface LinhaCusto extends LinhaConsumo {
  preco_unitario: number;
  custo_total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, dec = 2) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarMeses() {
  const hoje = new Date();
  const lista: { label: string; value: string }[] = [];
  for (let i = 0; i <= 12; i++) {
    const d = startOfMonth(i === 0 ? hoje : subMonths(hoje, i));
    lista.push({
      label: format(d, "MMMM/yyyy", { locale: ptBR }),
      value: format(d, "yyyy-MM-dd"),
    });
  }
  return lista;
}

function agrupar(dados: ResumoRPC[]): LinhaConsumo[] {
  const map: Record<string, LinhaConsumo> = {};
  for (const r of dados) {
    if (r.produto_categoria === "SOBRA") continue;
    const key = `${r.maquina}||${r.produto_codigo}`;
    if (!map[key]) {
      map[key] = {
        maquina:            r.maquina,
        cod_produto:        r.produto_codigo,
        descricao:          r.produto_descricao,
        categoria:          r.produto_categoria,
        tipo_material:      r.tipo_material ?? "—",
        padrao:             r.padrao ?? null,
        pecas:              0,
        volume_unitario_m3: r.volume_unitario_m3 ?? 0,
        consumo_m3:         0,
      };
    }
    map[key].pecas      += r.pecas ?? 0;
    map[key].consumo_m3 += r.consumo_m3 ?? 0;
  }
  return Object.values(map).sort(
    (a, b) => a.maquina.localeCompare(b.maquina) || b.consumo_m3 - a.consumo_m3
  );
}

const MESES     = gerarMeses();
const MES_ATUAL = format(startOfMonth(new Date()), "yyyy-MM-dd");
const COR_VERDE = "hsl(var(--primary))";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function UsoeConsumoPage() {
  const [aba, setAba]   = useState<"consumo" | "custo">("consumo");
  const [mes, setMes]   = useState(MES_ATUAL);

  // dados brutos (carregados uma vez por mês)
  const [dadosSecc,      setDadosSecc]      = useState<ResumoRPC[]>([]);
  const [dadosLix,       setDadosLix]       = useState<ResumoRPC[]>([]);
  const [dadosRec,       setDadosRec]       = useState<ResumoRPC[]>([]);
  const [precoMap,       setPrecoMap]       = useState<Record<string, number>>({});
  const [precoDescMap,   setPrecoDescMap]   = useState<Record<string, number>>({});
  const [precoCodigoDesc,setPrecoCodigoDesc]= useState<Record<string, string>>({});
  const [precoDimMap,    setPrecoDimMap]    = useState<Record<string, { larg_cm: number; comp_cm: number; esp_mm: number }>>({});
  const [dadosMatEntrada,setDadosMatEntrada]= useState<RowMatEntrada[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [year, month] = mes.split("-").map(Number);
      const fim = format(new Date(year, month, 0), "yyyy-MM-dd");

      const [rSecc, rLix, rRec] = await Promise.all([
        supabase.rpc("producao_seccionadora_resumo",  { p_inicio: mes, p_fim: fim }),
        supabase.rpc("producao_lixadeira_resumo",     { p_inicio: mes, p_fim: fim }),
        supabase.rpc("producao_recobrimento_resumo",  { p_inicio: mes, p_fim: fim }),
      ]);

      // Fetch paginado de produtos (tabela pode ter 1000+ linhas de TAMPO)
      const pm:  Record<string, number> = {};
      const pdm: Record<string, number> = {};
      const pcd: Record<string, string> = {}; // codigo → descricao
      const pdim: Record<string, { larg_cm: number; comp_cm: number; esp_mm: number }> = {}; // codigo → dimensões
      let prodPag = 0;
      while (true) {
        const { data: prodData, error: prodErr } = await supabase
          .from("produtos")
          .select("codigo, descricao, preco_unitario, valor, dim_largura, dim_comprimento, dim_espessura")
          .order("codigo", { ascending: true })
          .range(prodPag * 1000, (prodPag + 1) * 1000 - 1);
        if (prodErr) { console.error("[UsoeConsumo] produtos:", prodErr); break; }
        if (!prodData || prodData.length === 0) break;
        for (const p of prodData as PrecoProduto[]) {
          const cod = String(p.codigo).trim();
          const preco = (p.valor && p.valor > 0) ? p.valor : (p.preco_unitario ?? 0);
          pm[cod] = preco;
          if (p.descricao) {
            pdm[p.descricao.trim().toLowerCase()] = preco;
            pcd[cod] = p.descricao.trim();
          }
          // dim_largura e dim_comprimento em metros → converter para cm
          if (p.dim_largura && p.dim_comprimento && p.dim_espessura) {
            pdim[cod] = {
              larg_cm: p.dim_largura * 100,
              comp_cm: p.dim_comprimento * 100,
              esp_mm:  p.dim_espessura,
            };
          }
        }
        if (prodData.length < 1000) break;
        prodPag++;
      }
      // Fetch material recebido pela Seccionadora (para aba Custo)
      const matRows: RowMatEntrada[] = [];
      let matPag = 0;
      while (true) {
        const { data: matData, error: matErr } = await supabase
          .from("registros_producao")
          .select("maquina, tipo_material, tipo_chapa, qtd_chapas, larg_recebido_cm, comp_recebido_cm, esp_recebido_mm, produto, produto_sobra, qtd_producao_1, qtd_producao_2, qtd_sobra, larg_sobra_cm, comp_sobra_cm, esp_sobra_mm")
          .ilike("maquina", "%seccionadora%")
          .gte("data", mes)
          .lte("data", fim)
          .not("tipo_material", "is", null)
          .order("data", { ascending: true })
          .range(matPag * 1000, (matPag + 1) * 1000 - 1);
        if (matErr) { console.error("[UsoeConsumo] matData:", matErr); break; }
        if (!matData || matData.length === 0) break;
        matRows.push(...(matData as RowMatEntrada[]));
        if (matData.length < 1000) break;
        matPag++;
      }
      setDadosSecc((rSecc.data ?? []) as ResumoRPC[]);
      setDadosLix((rLix.data   ?? []) as ResumoRPC[]);
      setDadosRec((rRec.data   ?? []) as ResumoRPC[]);
      setPrecoMap(pm);
      setPrecoDescMap(pdm);
      setPrecoCodigoDesc(pcd);
      setPrecoDimMap(pdim);
      setDadosMatEntrada(matRows);
      setLoading(false);
    }
    void load();
  }, [mes]);

  return (
    <div className="space-y-4 pb-16">

      {/* Cabeçalho */}
      <div className="border-b pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produção</p>
          <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Uso e Consumo</h1>
        </div>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">
            {MESES.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {([
          { id: "consumo", label: "Consumo em m³" },
          { id: "custo",   label: "Custo em R$"   },
        ] as const).map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              a.id === aba
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-16"><SpinnerCustom /></div>
      ) : aba === "consumo" ? (
        <AbaConsumo
          dadosSecc={dadosSecc}
          dadosLix={dadosLix}
          dadosRec={dadosRec}
        />
      ) : (
        <AbaCusto
          dadosMatEntrada={dadosMatEntrada}
          precoMap={precoMap}
          codigoDescMap={precoCodigoDesc}
          dimMap={precoDimMap}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA CONSUMO — todas as máquinas, foco em m³
// ══════════════════════════════════════════════════════════════════════════════

function AbaConsumo({ dadosSecc, dadosLix, dadosRec }: {
  dadosSecc: ResumoRPC[];
  dadosLix:  ResumoRPC[];
  dadosRec:  ResumoRPC[];
}) {
  const [maquinasSel, setMaquinasSel] = useState<string[]>([]);
  const [maquinasOpen, setMaquinasOpen] = useState(false);

  const linhas = useMemo(
    () => agrupar([...dadosSecc, ...dadosLix, ...dadosRec]),
    [dadosSecc, dadosLix, dadosRec]
  );

  const maquinas        = useMemo(() => [...new Set(linhas.map(l => l.maquina))].sort(), [linhas]);
  const linhasFiltradas = maquinasSel.length === 0 ? linhas : linhas.filter(l => maquinasSel.includes(l.maquina));

  function toggleMaquina(m: string) {
    setMaquinasSel(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  const totalM3    = linhasFiltradas.reduce((s, l) => s + l.consumo_m3, 0);
  const totalPecas = linhasFiltradas.reduce((s, l) => s + l.pecas, 0);
  const nProdutos  = new Set(linhasFiltradas.map(l => l.cod_produto)).size;
  const nMaquinas  = new Set(linhasFiltradas.map(l => l.maquina)).size;

  const porMaquina = maquinas
    .filter(m => maquinasSel.length === 0 || maquinasSel.includes(m))
    .map(maq => {
      const ls = linhasFiltradas.filter(l => l.maquina === maq);
      return { maquina: maq, linhas: ls, totalM3: ls.reduce((s, l) => s + l.consumo_m3, 0), totalPecas: ls.reduce((s, l) => s + l.pecas, 0) };
    });

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Box     size={15} style={{ color: COR_VERDE }} />} label="MDF processado"    value={`${fmt(totalM3, 3)} m³`}           />
        <KpiCard icon={<Package size={15} style={{ color: COR_VERDE }} />} label="Peças produzidas"  value={totalPecas.toLocaleString("pt-BR")}  />
        <KpiCard icon={<Layers  size={15} style={{ color: COR_VERDE }} />} label="Produtos distintos" value={nProdutos.toString()}                />
        <KpiCard icon={<Factory size={15} style={{ color: COR_VERDE }} />} label="Máquinas ativas"   value={nMaquinas.toString()}               />
      </div>

      {/* Filtro máquinas */}
      {maquinas.length > 1 && (
        <div className="flex justify-end">
          <Popover open={maquinasOpen} onOpenChange={setMaquinasOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-normal">
                <Factory size={13} />
                {maquinasSel.length === 0 ? "Todas as máquinas" : maquinasSel.length === 1 ? maquinasSel[0] : `${maquinasSel.length} máquinas`}
                <ChevronDown size={11} className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="space-y-0.5">
                <button
                  onClick={() => setMaquinasSel([])}
                  className={cn("flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                    maquinasSel.length === 0 ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-muted-foreground")}
                >
                  Todas as máquinas
                </button>
                <div className="h-px bg-border my-1" />
                {maquinas.map(m => (
                  <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors">
                    <Checkbox checked={maquinasSel.includes(m)} onCheckedChange={() => toggleMaquina(m)} className="h-3.5 w-3.5" />
                    {m}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Tabela */}
      {linhasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado de produção no período.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Peças</TableHead>
                    <TableHead className="text-right">m³ / peça</TableHead>
                    <TableHead className="text-right">Total m³</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porMaquina.map(({ maquina, linhas: ls, totalM3: tm3, totalPecas: tp }) => (
                    <Fragment key={maquina}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={3} className="py-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                            <Factory className="h-3.5 w-3.5 text-muted-foreground" />{maquina}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-bold py-2">{tp.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="py-2" />
                        <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-amber-600 dark:text-amber-400">{fmt(tm3, 4)} m³</TableCell>
                      </TableRow>
                      {ls.map(l => (
                        <TableRow key={`${l.maquina}||${l.cod_produto}`}>
                          <TableCell className="text-xs pl-7">
                            <span className="font-medium">{l.descricao}</span>
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{l.cod_produto}</span>
                            {l.padrao && <span className="ml-1.5 text-[10px] text-muted-foreground italic">{l.padrao}</span>}
                          </TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{l.categoria}</Badge></TableCell>
                          <TableCell className="text-xs">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              l.tipo_material.includes("Hidro")
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400")}>
                              {l.tipo_material}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{l.pecas.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmt(l.volume_unitario_m3, 6)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">{fmt(l.consumo_m3, 4)} m³</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                  <TableRow className="border-t-2 bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={3} className="text-xs font-bold py-2 text-right pr-4 text-muted-foreground uppercase tracking-wide">Total geral</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold py-2">{totalPecas.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="py-2" />
                    <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-amber-600 dark:text-amber-400">{fmt(totalM3, 4)} m³</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA CUSTO — somente Seccionadora, foco em R$
// ══════════════════════════════════════════════════════════════════════════════

function AbaCusto({ dadosMatEntrada, precoMap, codigoDescMap, dimMap }: {
  dadosMatEntrada: RowMatEntrada[];
  precoMap: Record<string, number>;
  codigoDescMap: Record<string, string>;
  dimMap: Record<string, { larg_cm: number; comp_cm: number; esp_mm: number }>;
}) {
  const linhas: LinhaMatCusto[] = useMemo(() => {
    const map: Record<string, {
      maquina: string; tipo_material: string; tipo_chapa: string; consumo_m3: number;
      produtos: Map<string, { pecas: number; consumo_m3: number }>;
    }> = {};
    for (const r of dadosMatEntrada) {
      const mat = r.tipo_material?.trim() ?? "";
      if (!mat) continue;
      const qtd = r.qtd_chapas ?? 0;
      if (qtd <= 0) continue;
      const chapa = r.tipo_chapa != null ? String(r.tipo_chapa).trim() : null;
      const prodDim = chapa ? dimMap[chapa] : undefined;
      const larg = r.larg_recebido_cm ?? prodDim?.larg_cm ?? 0;
      const comp = r.comp_recebido_cm ?? prodDim?.comp_cm ?? 0;
      const esp  = r.esp_recebido_mm  ?? prodDim?.esp_mm  ?? 0;
      if (larg <= 0 || comp <= 0 || esp <= 0) continue;
      const key = `${r.maquina}||${mat}`;
      if (!map[key]) map[key] = { maquina: r.maquina, tipo_material: mat, tipo_chapa: chapa ?? "", consumo_m3: 0, produtos: new Map() };

      const row_m3 = (qtd * larg * comp * esp) / 10000000;
      map[key].consumo_m3 += row_m3;

      const pecas_princ = (r.qtd_producao_1 ?? 0) + (r.qtd_producao_2 ?? 0);
      const pecas_sobra = r.qtd_sobra ?? 0;

      // m³ da sobra calculado pelas dimensões reais da peça de sobra
      const m3_sobra = (pecas_sobra > 0 && r.larg_sobra_cm && r.comp_sobra_cm && r.esp_sobra_mm)
        ? (pecas_sobra * r.larg_sobra_cm * r.comp_sobra_cm * r.esp_sobra_mm) / 10000000
        : 0;
      // m³ do produto principal = total da chapa menos o que virou sobra
      const m3_princ = Math.max(0, row_m3 - m3_sobra);

      if (r.produto) {
        const nome = r.produto.trim();
        const prev = map[key].produtos.get(nome) ?? { pecas: 0, consumo_m3: 0 };
        map[key].produtos.set(nome, { pecas: prev.pecas + pecas_princ, consumo_m3: prev.consumo_m3 + m3_princ });
      }
      if (r.produto_sobra && pecas_sobra > 0) {
        const nome = r.produto_sobra.trim();
        const prev = map[key].produtos.get(nome) ?? { pecas: 0, consumo_m3: 0 };
        map[key].produtos.set(nome, { pecas: prev.pecas + pecas_sobra, consumo_m3: prev.consumo_m3 + m3_sobra });
      }
    }
    return Object.values(map).flatMap(l => {
      const consumo = Math.round(l.consumo_m3 * 1000000) / 1000000;
      const preco = l.tipo_chapa ? (precoMap[l.tipo_chapa] ?? 0) : 0;
      if (preco === 0) return [];
      const descricao_produto = codigoDescMap[l.tipo_chapa] ?? l.tipo_material;
      const produtos_produzidos: ProdutoProduzido[] = [...l.produtos.entries()]
        .map(([nome, p]) => ({
          nome,
          pecas: p.pecas,
          consumo_m3: Math.round(p.consumo_m3 * 1000000) / 1000000,
          custo: Math.round(p.consumo_m3 * preco * 100) / 100,
        }))
        .sort((a, b) => b.pecas - a.pecas || a.nome.localeCompare(b.nome));
      return [{ ...l, consumo_m3: consumo, descricao_produto, preco_m3: preco, custo_total: consumo * preco, produtos_produzidos }];
    }).sort((a, b) => b.custo_total - a.custo_total || b.consumo_m3 - a.consumo_m3);
  }, [dadosMatEntrada, precoMap, codigoDescMap, dimMap]);

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  function toggleExpand(key: string) {
    setExpandidos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  const totalM3    = linhas.reduce((s, l) => s + l.consumo_m3,  0);
  const totalCusto = linhas.reduce((s, l) => s + l.custo_total, 0);
  const semPreco   = linhas.filter(l => l.preco_m3 === 0).length;

  const maquinas   = [...new Set(linhas.map(l => l.maquina))].sort();
  const porMaquina = maquinas.map(maq => {
    const ls = linhas.filter(l => l.maquina === maq);
    return {
      maquina:    maq,
      linhas:     ls,
      totalM3:    ls.reduce((s, l) => s + l.consumo_m3,  0),
      totalCusto: ls.reduce((s, l) => s + l.custo_total, 0),
    };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <KpiCard icon={<DollarSign size={15} style={{ color: "#22c55e" }} />} label="Custo total estimado" value={fmtBRL(totalCusto)} highlight />
        <KpiCard icon={<Scissors   size={15} style={{ color: COR_VERDE }} />} label="MDF processado"       value={`${fmt(totalM3, 3)} m³`} />
      </div>

      {semPreco > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          ⚠ {semPreco} material(is) sem preço cadastrado — custo parcialmente estimado.
        </p>
      )}

      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {dadosMatEntrada.length > 0
            ? `${dadosMatEntrada.length} registro(s) de entrada encontrado(s), mas sem dimensões de produto disponíveis. Verifique o cadastro de produtos (dim_largura / dim_comprimento / dim_espessura).`
            : "Nenhum material recebido pela Seccionadora no período."}
        </p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material de Entrada</TableHead>
                    <TableHead className="text-right">Total m³</TableHead>
                    <TableHead className="text-right">Preço / m³</TableHead>
                    <TableHead className="text-right">Custo total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porMaquina.map(({ maquina, linhas: ls, totalM3: tm3, totalCusto: tc }) => (
                    <Fragment key={maquina}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell className="py-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                            <Scissors className="h-3.5 w-3.5 text-muted-foreground" />{maquina}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-amber-600 dark:text-amber-400">{fmt(tm3, 4)} m³</TableCell>
                        <TableCell className="py-2" />
                        <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-emerald-600 dark:text-emerald-400">{fmtBRL(tc)}</TableCell>
                      </TableRow>
                      {ls.map(l => {
                        const rowKey = `${l.maquina}||${l.tipo_material}`;
                        const aberto = expandidos.has(rowKey);
                        return (
                          <Fragment key={rowKey}>
                            <TableRow>
                              <TableCell className="text-xs pl-7 font-medium">
                                <span className="flex items-center gap-1.5">
                                  {l.produtos_produzidos.length > 0 && (
                                    <button
                                      onClick={() => toggleExpand(rowKey)}
                                      className="flex-shrink-0 h-4 w-4 rounded border border-muted-foreground/40 text-muted-foreground hover:bg-muted flex items-center justify-center text-[10px] font-bold leading-none"
                                    >
                                      {aberto ? "−" : "+"}
                                    </button>
                                  )}
                                  {l.descricao_produto}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-amber-600 dark:text-amber-400">{fmt(l.consumo_m3, 4)} m³</TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                                {l.preco_m3 > 0 ? fmtBRL(l.preco_m3) : <span className="opacity-40">—</span>}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                                {l.custo_total > 0 ? fmtBRL(l.custo_total) : <span className="opacity-40 font-normal">—</span>}
                              </TableCell>
                            </TableRow>
                            {aberto && l.produtos_produzidos.map(p => (
                              <TableRow key={p.nome} className="bg-muted/20 hover:bg-muted/20">
                                <TableCell className="text-xs pl-14 text-muted-foreground italic">↳ {p.nome}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                                  {p.pecas > 0 ? <>{p.pecas.toLocaleString("pt-BR")} <span className="opacity-60">pçs</span></> : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmt(p.consumo_m3, 4)} m³</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtBRL(p.custo)}</TableCell>
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  ))}
                  <TableRow className="border-t-2 bg-muted/20 hover:bg-muted/20">
                    <TableCell className="text-xs font-bold py-2 text-muted-foreground uppercase tracking-wide">Total geral</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-amber-600 dark:text-amber-400">{fmt(totalM3, 4)} m³</TableCell>
                    <TableCell className="py-2" />
                    <TableCell className="text-xs text-right tabular-nums font-bold py-2 text-emerald-600 dark:text-emerald-400">{fmtBRL(totalCusto)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={cn("bg-card border rounded-xl p-4 flex flex-col gap-1",
      highlight && "border-emerald-200 dark:border-emerald-900")}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", highlight && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
    </div>
  );
}
