"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, endOfMonth, getDaysInMonth } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { XCircle, ChevronDown } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RncRelatoriosTab from "./RncRelatoriosTab";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";

const COR_NC    = "#dc2626";
const COR_BARRA = "#b91c1c";
const COR_VERDE = "hsl(var(--primary))";

const MESES_NOMES = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];

// Keywords para classificar máquinas por setor (case-insensitive)
const KEYWORDS_PORTAS = [
  "esquadrejadeira",
  "colagem de borda",
  "pintura de tampo",
  "pintura de porta",
  "embalagem de porta",
  "furação e corte",
];

const KEYWORDS_GUARNICAO = [
  "recobridora de perfil",
  "unesa",
  "gaidzinski",
  "coladeira de alizar",
  "plaina moldureira",
];

type Setor = "todos" | "portas" | "guarnicao";

function getSetorMaquina(maquina: string): "portas" | "guarnicao" | null {
  const lower = (maquina ?? "").toLowerCase();
  if (KEYWORDS_PORTAS.some(k => lower.includes(k))) return "portas";
  if (KEYWORDS_GUARNICAO.some(k => lower.includes(k))) return "guarnicao";
  return null;
}

interface RowNC {
  maquina:            string | null;
  data:               string;
  padrao:             string | null;
  tipo_defeito_1:     string | null;
  qtd_nao_conforme_1: number | null;
  tipo_defeito_2:     string | null;
  qtd_nao_conforme_2: number | null;
  tipo_defeito_3:     string | null;
  qtd_nao_conforme_3: number | null;
  tipo_defeito_4:     string | null;
  qtd_nao_conforme_4: number | null;
}

function pctBar(pct: number) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 90, height: 10, background: "#fee2e2", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: COR_BARRA, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: COR_NC, minWidth: 48, textAlign: "right" }}>
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

const hoje = new Date();
const ANOS = Array.from({ length: 5 }, (_, i) => String(hoje.getFullYear() - i));

const SETOR_LABELS: Record<Setor, string> = {
  todos:     "Todos",
  portas:    "Portas",
  guarnicao: "Guarnição",
};

type AbaNC = "analise" | "relatorios";

export default function NaoConformidadesTab() {
  const [abaNC, setAbaNC] = useState<AbaNC>("analise");

  const [anoFiltro,   setAnoFiltro]   = useState(String(hoje.getFullYear()));
  const [mesFiltro,   setMesFiltro]   = useState("todos");
  const [setorFiltro, setSetorFiltro] = useState<Setor>("todos");
  const [maqFiltro,   setMaqFiltro]   = useState("todos");
  const [diasSel,     setDiasSel]     = useState<Set<number>>(new Set());
  const [rows,        setRows]        = useState<RowNC[]>([]);
  const [loading,     setLoading]     = useState(false);

  const ncReqRef = useRef(0);

  const buscar = useCallback(async () => {
    ncReqRef.current += 1;
    const myReq = ncReqRef.current;
    setLoading(true);

    const anoInicio = `${anoFiltro}-01-01`;
    const anoFim    = `${anoFiltro}-12-31`;
    let dataInicio = anoInicio;
    let dataFim    = anoFim;

    if (mesFiltro !== "todos") {
      const mm = String(Number(mesFiltro)).padStart(2, "0");
      dataInicio = `${anoFiltro}-${mm}-01`;
      dataFim    = format(endOfMonth(new Date(Number(anoFiltro), Number(mesFiltro) - 1, 1)), "yyyy-MM-dd");
    }

    const COLS = "maquina,data,padrao,tipo_defeito_1,qtd_nao_conforme_1,tipo_defeito_2,qtd_nao_conforme_2,tipo_defeito_3,qtd_nao_conforme_3,tipo_defeito_4,qtd_nao_conforme_4";
    const TAM = 1000;
    let pagina = 0;
    const todas: RowNC[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select(COLS)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .range(pagina * TAM, (pagina + 1) * TAM - 1);

      if (myReq !== ncReqRef.current) return;
      if (error || !data) break;
      todas.push(...(data as RowNC[]));
      if (data.length < TAM) break;
      pagina++;
    }

    if (myReq !== ncReqRef.current) return;
    setRows(todas.filter(r =>
      (r.qtd_nao_conforme_1 ?? 0) > 0 ||
      (r.qtd_nao_conforme_2 ?? 0) > 0 ||
      (r.qtd_nao_conforme_3 ?? 0) > 0 ||
      (r.qtd_nao_conforme_4 ?? 0) > 0
    ));
    setLoading(false);
  }, [anoFiltro, mesFiltro]);

  useEffect(() => { void buscar(); }, [buscar]);

  // Ao trocar setor, reseta filtro de máquina
  const handleSetorChange = (setor: Setor) => {
    setSetorFiltro(setor);
    setMaqFiltro("todos");
  };

  // Ao trocar mês, reseta seleção de dias
  const handleMesChange = (v: string) => {
    setMesFiltro(v);
    setDiasSel(new Set());
  };

  // Aplica filtro de setor
  const rowsSetor = setorFiltro === "todos"
    ? rows
    : rows.filter(r => getSetorMaquina(r.maquina ?? "") === setorFiltro);

  // Aplica filtro de máquina client-side
  const rowsFiltrados = maqFiltro === "todos"
    ? rowsSetor
    : rowsSetor.filter(r => (r.maquina ?? "") === maqFiltro);

  // Aplica filtro de dia client-side (só quando um mês específico está selecionado)
  const rowsComDia = mesFiltro !== "todos" && diasSel.size > 0
    ? rowsFiltrados.filter(r => diasSel.has(Number(r.data.slice(8, 10))))
    : rowsFiltrados;

  // Lista de máquinas únicas do setor selecionado
  const maquinas = Array.from(new Set(rowsSetor.map(r => r.maquina ?? "—"))).sort();

  // Total NC
  const totalNC = rowsComDia.reduce((s, r) =>
    s + (r.qtd_nao_conforme_1 ?? 0) + (r.qtd_nao_conforme_2 ?? 0) +
        (r.qtd_nao_conforme_3 ?? 0) + (r.qtd_nao_conforme_4 ?? 0), 0);

  // NC por Máquina
  const ncMaquinaMap: Record<string, number> = {};
  for (const r of rowsComDia) {
    const m = r.maquina ?? "—";
    const v = (r.qtd_nao_conforme_1 ?? 0) + (r.qtd_nao_conforme_2 ?? 0) +
              (r.qtd_nao_conforme_3 ?? 0) + (r.qtd_nao_conforme_4 ?? 0);
    ncMaquinaMap[m] = (ncMaquinaMap[m] ?? 0) + v;
  }
  const ncMaquina = Object.entries(ncMaquinaMap)
    .map(([maquina, total]) => ({ maquina: maquina.toUpperCase(), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // NC por Mês
  const ncMesMap: Record<string, number> = {};
  for (let i = 1; i <= 12; i++) ncMesMap[String(i).padStart(2, "0")] = 0;
  for (const r of rowsComDia) {
    const mm = r.data.slice(5, 7);
    const v = (r.qtd_nao_conforme_1 ?? 0) + (r.qtd_nao_conforme_2 ?? 0) +
              (r.qtd_nao_conforme_3 ?? 0) + (r.qtd_nao_conforme_4 ?? 0);
    ncMesMap[mm] = (ncMesMap[mm] ?? 0) + v;
  }
  const ncMesTodos = Object.entries(ncMesMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([mm, total]) => ({
      label: MESES_NOMES[Number(mm) - 1],
      mes: Number(mm),
      total,
    }));
  // Limite: ano atual → até o mês corrente; ano passado → até o último mês com NC
  const ultimoNCMes = [...ncMesTodos].reverse().find(m => m.total > 0)?.mes ?? 0;
  const limiteNC = anoFiltro === String(hoje.getFullYear())
    ? Math.max(hoje.getMonth() + 1, ultimoNCMes)
    : ultimoNCMes || 12;
  const ncMes = ncMesTodos.filter(m => m.mes <= limiteNC);

  // NC por Padrão
  const ncPadraoMap: Record<string, number> = {};
  for (const r of rowsComDia) {
    const p = r.padrao || "—";
    const v = (r.qtd_nao_conforme_1 ?? 0) + (r.qtd_nao_conforme_2 ?? 0) +
              (r.qtd_nao_conforme_3 ?? 0) + (r.qtd_nao_conforme_4 ?? 0);
    if (v > 0) ncPadraoMap[p] = (ncPadraoMap[p] ?? 0) + v;
  }
  const ncPadrao = Object.entries(ncPadraoMap)
    .map(([padrao, total]) => ({ padrao, total, pct: totalNC > 0 ? (total / totalNC) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  // NC por Tipo de Defeito
  const ncTipoMap: Record<string, number> = {};
  for (const r of rowsComDia) {
    const pares: [string | null, number | null][] = [
      [r.tipo_defeito_1, r.qtd_nao_conforme_1],
      [r.tipo_defeito_2, r.qtd_nao_conforme_2],
      [r.tipo_defeito_3, r.qtd_nao_conforme_3],
      [r.tipo_defeito_4, r.qtd_nao_conforme_4],
    ];
    for (const [tipo, qtd] of pares) {
      if (tipo && (qtd ?? 0) > 0) {
        ncTipoMap[tipo] = (ncTipoMap[tipo] ?? 0) + (qtd ?? 0);
      }
    }
  }
  const ncTipo = Object.entries(ncTipoMap)
    .map(([tipo, total]) => ({ tipo, total, pct: totalNC > 0 ? (total / totalNC) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">

      {/* ── Abas internas ── */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
        {([
          { id: "analise",    label: "Análise" },
          { id: "relatorios", label: "Relatórios RNC/AC" },
        ] as { id: AbaNC; label: string }[]).map(a => (
          <button key={a.id} onClick={() => setAbaNC(a.id)}
            className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={
              abaNC === a.id
                ? { background: COR_VERDE, color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }
                : { background: "transparent", color: "#6b7280" }
            }>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo: Relatórios RNC/AC ── */}
      {abaNC === "relatorios" && <RncRelatoriosTab />}

      {/* ── Conteúdo: Análise (existente) ── */}
      {abaNC === "analise" && <>

      {/* ── Setor Toggle ── */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
        {(["todos", "portas", "guarnicao"] as Setor[]).map(s => (
          <button
            key={s}
            onClick={() => handleSetorChange(s)}
            className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={
              setorFiltro === s
                ? { background: COR_VERDE, color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }
                : { background: "transparent", color: "#6b7280" }
            }
          >
            {SETOR_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ── Filtros + KPI ── */}
      <div className="flex flex-wrap items-end gap-6">
        {/* KPI */}
        <Card className="border-red-200 bg-red-50 shrink-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700 leading-none">
                {loading ? "…" : totalNC.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-red-500 mt-1 font-medium">
                Qtd. Inconforme
                {setorFiltro !== "todos" && (
                  <span className="ml-1 text-red-400">· {SETOR_LABELS[setorFiltro]}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Ano</Label>
            <Select value={anoFiltro} onValueChange={setAnoFiltro}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mês</Label>
            <Select value={mesFiltro} onValueChange={handleMesChange}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MESES_NOMES.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mesFiltro !== "todos" && (() => {
            const totalDias = getDaysInMonth(new Date(Number(anoFiltro), Number(mesFiltro) - 1, 1));
            const nomeMes = MESES_NOMES[Number(mesFiltro) - 1];
            const todosSel = diasSel.size === 0;
            const labelBtn = todosSel ? "Todos" : `${diasSel.size} dia${diasSel.size > 1 ? "s" : ""}`;
            const toggleTodos = () => setDiasSel(new Set());
            const toggleDia = (d: number) => {
              setDiasSel(prev => {
                const next = new Set(prev);
                if (next.has(d)) next.delete(d); else next.add(d);
                return next;
              });
            };
            return (
              <div className="space-y-1">
                <Label className="text-xs">Dia</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-8 text-xs w-28 border border-input rounded-md px-2 flex items-center justify-between bg-background hover:bg-accent transition-colors"
                    >
                      <span className="truncate">{labelBtn}</span>
                      <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-44" align="start">
                    <div className="max-h-72 overflow-y-auto text-xs">
                      <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                        <input type="checkbox" checked={todosSel} onChange={toggleTodos} className="h-3.5 w-3.5 accent-primary" />
                        <span>Selecionar todos</span>
                      </label>
                      <div className="border-t my-0.5" />
                      <div className="px-3 py-1 text-muted-foreground font-medium text-xs">{nomeMes}</div>
                      {Array.from({ length: totalDias }, (_, i) => i + 1).map(d => (
                        <label key={d} className="flex items-center gap-2 px-5 py-0.5 hover:bg-accent cursor-pointer">
                          <input
                            type="checkbox"
                            checked={todosSel || diasSel.has(d)}
                            onChange={() => toggleDia(d)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            );
          })()}
          <div className="space-y-1">
            <Label className="text-xs">Máquina</Label>
            <Select value={maqFiltro} onValueChange={setMaqFiltro}>
              <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {maquinas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
      ) : (
        <>
          {/* ── Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* NC por Máquina */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Qtd. Inconformidades por Máquina
                  {setorFiltro !== "todos" && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: "#f0fdf4", color: COR_VERDE }}>
                      {SETOR_LABELS[setorFiltro]}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                {ncMaquina.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, ncMaquina.length * 44)}>
                    <BarChart
                      layout="vertical"
                      data={ncMaquina}
                      margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: "Soma de QTD NÃO CONFORME", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="maquina"
                        tick={{ fontSize: 9 }}
                        width={170}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 23) + "…" : v}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11 }}
                        formatter={(v: number) => [v.toLocaleString("pt-BR"), "NC"]}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {ncMaquina.map((_, i) => <Cell key={i} fill={COR_VERDE} />)}
                        <LabelList dataKey="total" position="right" style={{ fontSize: 11, fontWeight: 600, fill: COR_VERDE }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* NC por Mês */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Qtd. Inconformes por Mês
                  {setorFiltro !== "todos" && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: "#f0fdf4", color: COR_VERDE }}>
                      {SETOR_LABELS[setorFiltro]}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={ncMes}
                    margin={{ top: 16, right: 8, left: -10, bottom: 4 }}
                    barSize={28}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Mês", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Portas", angle: -90, position: "insideLeft", fontSize: 9, fill: "#9ca3af" }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(v: number) => [v.toLocaleString("pt-BR"), "NC"]}
                    />
                    <Bar dataKey="total" fill={COR_VERDE} radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 600, fill: COR_VERDE }}
                        formatter={(v: number) => v > 0 ? v : ""} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Tabelas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Inconformidades por Padrão */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Inconformidades por Padrão
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: COR_VERDE }}>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-white">Padrão</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-white">Qtd. Inconforme</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-white">Padrão %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ncPadrao.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground">Sem dados.</td></tr>
                      ) : (
                        <>
                          {ncPadrao.map((row, i) => (
                            <tr key={row.padrao} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                              <td className="px-4 py-2 text-xs font-medium">{row.padrao}</td>
                              <td className="px-4 py-2 text-xs text-right font-bold" style={{ color: COR_NC }}>{row.total}</td>
                              <td className="px-4 py-2">{pctBar(row.pct)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                            <td className="px-4 py-2 text-xs font-bold">Total</td>
                            <td className="px-4 py-2 text-xs text-right font-bold" style={{ color: COR_NC }}>{totalNC}</td>
                            <td className="px-4 py-2 text-xs font-bold" style={{ color: COR_NC }}>100,00%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Defeito % */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Tipo de Defeito %
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: COR_VERDE }}>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-white">Tipo de Defeito</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-white">Qtd. Inconforme</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-white">Tipo de Defeito %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ncTipo.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground">Sem dados de tipo de defeito.</td></tr>
                      ) : (
                        <>
                          {ncTipo.map((row, i) => (
                            <tr key={row.tipo} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                              <td className="px-4 py-2 text-xs font-medium">{row.tipo}</td>
                              <td className="px-4 py-2 text-xs text-right font-bold" style={{ color: COR_NC }}>{row.total}</td>
                              <td className="px-4 py-2">{pctBar(row.pct)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                            <td className="px-4 py-2 text-xs font-bold">Total</td>
                            <td className="px-4 py-2 text-xs text-right font-bold" style={{ color: COR_NC }}>{totalNC}</td>
                            <td className="px-4 py-2 text-xs font-bold" style={{ color: COR_NC }}>100,00%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>
        </>
      )}

      </>}
    </div>
  );
}
