"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import { supabasePedidos } from "@/lib/supabase-pedidos";
import { supabase as supabaseMain } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, ChevronLeft, Search, Package, DollarSign, Clock, Factory, Loader2, ArrowRight, FileSpreadsheet } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import * as XLSX from "xlsx";

interface ItemPedido {
  id: string;
  produto: string;
  un: string;
  qtd: number;
  valor_un: number;
  valor_total: number;
  peso_liquido: number;
  desconto: number;
  percentual_desconto: number;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  data_emissao: string | null;
  previsao_embarque: string | null;
  cliente_nome: string | null;
  cliente_fantasia: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  grupo_cliente: string | null;
  representante: string | null;
  situacao_entrega: string | null;
  total_qtd: number | null;
  total_produtos: number | null;
  total_pedido_venda: number | null;
  peso_liquido_item: number | null;
  dados_tabela: string | Record<string, unknown> | null;
}

interface ProducaoMaquina {
  maquina: string;
  qtd: number;
  ultima_data: string;
}

const COR_VERDE = "hsl(var(--primary))";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
}

function fmtMoeda(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BadgeSituacao({ situacao }: { situacao: string | null }) {
  if (!situacao) return <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 500 }}>—</span>;
  const isEntregue = situacao === "Totalmente Entregue";
  const isPendente = situacao === "Pendente";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: isEntregue ? "#dcfce7" : isPendente ? "#fef3c7" : "#f3f4f6",
      color: isEntregue ? "#166534" : isPendente ? "#92400e" : "#6b7280",
      border: `1px solid ${isEntregue ? "#bbf7d0" : isPendente ? "#fde68a" : "#e5e7eb"}`,
    }}>
      {situacao}
    </span>
  );
}

function parseItens(dados_tabela: Pedido["dados_tabela"]): ItemPedido[] {
  try {
    const dt = typeof dados_tabela === "string" ? JSON.parse(dados_tabela) : dados_tabela;
    return (dt as { itens?: ItemPedido[] })?.itens ?? [];
  } catch {
    return [];
  }
}

// ─── Rastreamento de Produção ────────────────────────────────────────────────

function RastreamentoProducao({
  pedido,
  maquinas,
  loading,
}: {
  pedido: Pedido;
  maquinas: ProducaoMaquina[] | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
    );
  }

  const semDados = !maquinas || maquinas.length === 0;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Factory size={13} style={{ color: COR_VERDE }} />
        <span className="text-xs font-semibold" style={{ color: COR_VERDE }}>
          Rastreamento de Produção
        </span>
      </div>

      {semDados ? (
        <p className="text-xs text-muted-foreground">
          Nenhum registro de produção encontrado para este pedido.
        </p>
      ) : (
        <>
          {/* Barra de progresso */}
          {(() => {
            const ultima = maquinas![maquinas!.length - 1];
            const pct = pedido.total_qtd && pedido.total_qtd > 0
              ? Math.min((ultima.qtd / pedido.total_qtd) * 100, 100)
              : null;
            return pct !== null ? (
              <div className="flex items-center gap-3 mb-3">
                <div style={{ flex: 1, height: 7, background: "#dcfce7", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: pct >= 100 ? "#16a34a" : COR_VERDE,
                    borderRadius: 4, transition: "width .4s ease",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: COR_VERDE, minWidth: 38, textAlign: "right" }}>
                  {pct.toFixed(0)}%
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  na {ultima.maquina}
                </span>
              </div>
            ) : null;
          })()}

          {/* Pipeline de máquinas */}
          <div className="flex flex-wrap items-center gap-1.5">
            {maquinas!.map((m, i) => {
              const isLast = i === maquinas!.length - 1;
              return (
                <Fragment key={m.maquina}>
                  <div style={{
                    display: "inline-flex", flexDirection: "column", gap: 2,
                    padding: "5px 10px", borderRadius: 8,
                    border: `1.5px solid ${isLast ? COR_VERDE : "#e5e7eb"}`,
                    background: isLast ? "#f0fdf4" : "#fff",
                  }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 11, fontWeight: isLast ? 700 : 500, color: isLast ? COR_VERDE : "#374151" }}>
                        {m.maquina}
                      </span>
                      {isLast && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          background: COR_VERDE, color: "#fff",
                          borderRadius: 3, padding: "1px 5px",
                        }}>
                          ÚLTIMA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11, fontWeight: 600, color: isLast ? COR_VERDE : "#6b7280" }}>
                        {m.qtd.toLocaleString("pt-BR")} pçs
                      </span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>
                        {fmtDate(m.ultima_data)}
                      </span>
                    </div>
                  </div>
                  {i < maquinas!.length - 1 && (
                    <ArrowRight size={12} style={{ color: "#d1d5db", flexShrink: 0 }} />
                  )}
                </Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

const PER_PAGE = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltros(query: any, situacao: string, busca: string) {
  if (situacao === "pendente")     query = query.eq("situacao_entrega", "Pendente");
  if (situacao === "entregue")     query = query.eq("situacao_entrega", "Totalmente Entregue");
  if (situacao === "sem-situacao") query = query.is("situacao_entrega", null);
  if (busca.trim()) {
    const b = busca.trim();
    query = query.or(`cliente_nome.ilike.%${b}%,cliente_fantasia.ilike.%${b}%,numero_pedido.ilike.%${b}%,grupo_cliente.ilike.%${b}%`);
  }
  return query;
}

export default function PedidosPage() {
  const [pedidos, setPedidos]               = useState<Pedido[]>([]);
  const [total, setTotal]                   = useState(0);
  const [pagina, setPagina]                 = useState(0);
  const [loading, setLoading]               = useState(true);
  const [erro, setErro]                     = useState<string | null>(null);
  const [busca, setBusca]                   = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [expandidos, setExpandidos]         = useState<Set<string>>(new Set());
  const [statsValor, setStatsValor]         = useState(0);
  const [statsPendentes, setStatsPendentes] = useState(0);
  const buscaTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Produção: mapa pedido.id → máquinas agregadas
  const [producaoMap, setProducaoMap]           = useState<Record<string, ProducaoMaquina[]>>({});
  const [producaoLoading, setProducaoLoading]   = useState<Set<string>>(new Set());

  // Dados paginados — busca só a página atual
  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      setLoading(true);
      setErro(null);
      const from = pagina * PER_PAGE;
      const to   = from + PER_PAGE - 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, count, error } = await aplicarFiltros(
        supabasePedidos
          .from("concrem_pedidos_venda")
          .select("*", { count: "exact" })
          .order("data_emissao", { ascending: false })
          .range(from, to),
        filtroSituacao, buscaDebounced
      );
      if (cancelled) return;
      if (error) { setErro((error as any).message); setLoading(false); return; }
      setPedidos((data ?? []) as Pedido[]);
      setTotal(count ?? 0);
      setLoading(false);
    }
    carregar();
    return () => { cancelled = true; };
  }, [pagina, filtroSituacao, buscaDebounced]);

  // Stats via aggregate + count-only — sem buscar todas as linhas (evita timeout)
  useEffect(() => {
    let cancelled = false;
    async function carregarStats() {
      // Soma agregada — PostgREST retorna 1 linha, sem varrer todas as linhas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sumData } = await aplicarFiltros(
        supabasePedidos.from("concrem_pedidos_venda").select("total_pedido_venda.sum()"),
        filtroSituacao, buscaDebounced
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!cancelled) setStatsValor((sumData as any)?.[0]?.sum ?? 0);

      // Count-only de pendentes — head: true não traz linhas, só o count
      if (filtroSituacao === "entregue" || filtroSituacao === "sem-situacao") {
        if (!cancelled) setStatsPendentes(0);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabasePedidos
          .from("concrem_pedidos_venda")
          .select("*", { count: "exact", head: true })
          .eq("situacao_entrega", "Pendente");
        if (filtroSituacao === "pendente") {
          // já filtrado pelo eq acima
        }
        if (buscaDebounced.trim()) {
          const b = buscaDebounced.trim();
          q = q.or(`cliente_nome.ilike.%${b}%,cliente_fantasia.ilike.%${b}%,numero_pedido.ilike.%${b}%,grupo_cliente.ilike.%${b}%`);
        }
        const { count } = await q;
        if (!cancelled) setStatsPendentes(count ?? 0);
      }
    }
    carregarStats();
    return () => { cancelled = true; };
  }, [filtroSituacao, buscaDebounced]);

  async function fetchProducao(pedido: Pedido) {
    if (pedido.id in producaoMap) return;

    setProducaoLoading(prev => new Set([...prev, pedido.id]));

    // Termos de busca: número do pedido + nomes do cliente
    const termos = [
      pedido.numero_pedido,
      pedido.cliente_fantasia?.trim(),
      pedido.cliente_nome?.trim(),
    ]
      .filter(Boolean)
      .map(t => `cliente.ilike.%${t!}%`);

    let maquinas: ProducaoMaquina[] = [];

    if (termos.length > 0) {
      const { data } = await supabaseMain
        .from("registros_producao")
        .select("maquina, qtd_conforme, data")
        .or(termos.join(","))
        .gt("qtd_conforme", 0);

      if (data && data.length > 0) {
        const agg: Record<string, { qtd: number; ultima_data: string }> = {};
        for (const r of data) {
          const m = (r.maquina as string | null) ?? "—";
          if (!agg[m]) agg[m] = { qtd: 0, ultima_data: "" };
          agg[m].qtd += (r.qtd_conforme as number | null) ?? 0;
          const d = (r.data as string | null) ?? "";
          if (d > agg[m].ultima_data) agg[m].ultima_data = d;
        }
        maquinas = Object.entries(agg)
          .map(([maquina, v]) => ({ maquina, qtd: v.qtd, ultima_data: v.ultima_data }))
          .sort((a, b) => a.ultima_data < b.ultima_data ? -1 : 1);
      }
    }

    setProducaoMap(prev => ({ ...prev, [pedido.id]: maquinas }));
    setProducaoLoading(prev => { const s = new Set(prev); s.delete(pedido.id); return s; });
  }

  function toggleExpand(pedido: Pedido) {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(pedido.id)) {
        next.delete(pedido.id);
      } else {
        next.add(pedido.id);
        fetchProducao(pedido);
      }
      return next;
    });
  }

  const [exportandoExcel, setExportandoExcel] = useState(false);

  async function exportarExcel() {
    setExportandoExcel(true);
    try {
      const TAM = 1000;
      let pagE = 0;
      const todos: Pedido[] = [];
      while (true) {
        const { data } = await aplicarFiltros(
          supabasePedidos
            .from("concrem_pedidos_venda")
            .select("*")
            .order("data_emissao", { ascending: false })
            .range(pagE * TAM, (pagE + 1) * TAM - 1),
          filtroSituacao, buscaDebounced
        );
        if (!data || data.length === 0) break;
        todos.push(...(data as Pedido[]));
        if (data.length < TAM) break;
        pagE++;
      }

      const pedidosRows = todos.map(p => ({
        "N° Pedido": p.numero_pedido,
        "Emissão": p.data_emissao ? fmtDate(p.data_emissao) : "",
        "Prev. Embarque": p.previsao_embarque ? fmtDate(p.previsao_embarque) : "",
        "Cliente": p.cliente_fantasia?.trim() || p.cliente_nome || "",
        "Nome Completo": p.cliente_nome || "",
        "Cidade": p.cliente_cidade || "",
        "UF": p.cliente_uf || "",
        "Grupo": p.grupo_cliente || "",
        "Representante": p.representante || "",
        "Qtd. Total": p.total_qtd ?? "",
        "Valor Total (R$)": p.total_pedido_venda ?? "",
        "Situação": p.situacao_entrega || "",
      }));

      const itensRows: Record<string, unknown>[] = [];
      for (const p of todos) {
        const itens = parseItens(p.dados_tabela);
        for (const item of itens) {
          itensRows.push({
            "N° Pedido": p.numero_pedido,
            "Cliente": p.cliente_fantasia?.trim() || p.cliente_nome || "",
            "Produto": item.produto,
            "UN": item.un,
            "Qtd.": item.qtd,
            "Valor Unit. (R$)": item.valor_un,
            "Desconto (%)": item.percentual_desconto > 0 ? item.percentual_desconto : "",
            "Total (R$)": item.valor_total,
          });
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidosRows), "Pedidos");
      if (itensRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itensRows), "Itens");
      }
      XLSX.writeFile(wb, `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportandoExcel(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE));

  if (erro) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">
      Erro: {erro}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Pedidos de Venda</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Acompanhamento de pedidos e situação de entrega</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4" style={{ borderColor: "#d1fae5", background: "#f0fdf4" }}>
          <div className="flex items-center gap-2 mb-1">
            <Package size={15} style={{ color: COR_VERDE }} />
            <span className="text-xs font-medium text-muted-foreground">Total de Pedidos</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: COR_VERDE }}>{total}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "#d1fae5", background: "#f0fdf4" }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} style={{ color: COR_VERDE }} />
            <span className="text-xs font-medium text-muted-foreground">Valor Total</span>
          </div>
          <div className="text-lg font-bold" style={{ color: COR_VERDE }}>{fmtMoeda(statsValor)}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={15} style={{ color: "#92400e" }} />
            <span className="text-xs font-medium text-muted-foreground">Pendentes</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: "#92400e" }}>{statsPendentes}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white" style={{ minWidth: 260 }}>
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            value={busca}
            onChange={e => {
              setBusca(e.target.value);
              if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
              buscaTimerRef.current = setTimeout(() => {
                setBuscaDebounced(e.target.value);
                setPagina(0);
              }, 400);
            }}
            placeholder="Buscar por cliente ou n° pedido…"
            className="text-xs outline-none border-none bg-transparent w-full"
          />
        </div>
        {[
          { id: "todos",        label: "Todos" },
          { id: "pendente",     label: "Pendente" },
          { id: "entregue",     label: "Totalmente Entregue" },
          { id: "sem-situacao", label: "Sem situação" },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => { setPagina(0); setFiltroSituacao(opt.id); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: filtroSituacao === opt.id ? COR_VERDE : "transparent",
              color: filtroSituacao === opt.id ? "#fff" : "#374151",
              border: `1px solid ${filtroSituacao === opt.id ? COR_VERDE : "#d1d5db"}`,
              transition: "all .15s",
            }}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={exportarExcel}
          disabled={exportandoExcel}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: exportandoExcel ? "#d1fae5" : COR_VERDE,
            color: exportandoExcel ? COR_VERDE : "#fff",
            border: `1px solid ${COR_VERDE}`,
            cursor: exportandoExcel ? "not-allowed" : "pointer",
            transition: "all .15s", whiteSpace: "nowrap",
          }}
        >
          {exportandoExcel
            ? <><Loader2 size={13} className="animate-spin" /> Exportando…</>
            : <><FileSpreadsheet size={13} /> Exportar Excel</>
          }
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: COR_VERDE }}>
              <th className="px-3 py-2.5 w-8" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">N° Pedido</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Emissão</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Prev. Embarque</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Cliente</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Cidade/UF</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-white">Qtd.</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-white">Valor Total</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white">Situação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  <SpinnerCustom />
                </td>
              </tr>
            ) : pedidos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : pedidos.map((p, i) => {
              const isExp = expandidos.has(p.id);
              const itens = parseItens(p.dados_tabela);
              const maquinas = producaoMap[p.id];
              const loadingProd = producaoLoading.has(p.id);

              // % para mostrar inline na linha principal (quando não expandido)
              const ultimaMaq = maquinas && maquinas.length > 0 ? maquinas[maquinas.length - 1] : null;
              const pctInline = ultimaMaq && p.total_qtd && p.total_qtd > 0
                ? Math.min((ultimaMaq.qtd / p.total_qtd) * 100, 100)
                : null;

              return (
                <Fragment key={p.id}>
                  <tr
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: i % 2 === 0 ? "#fff" : "#f9fafb",
                      cursor: "pointer",
                    }}
                    className="hover:bg-green-50 transition-colors"
                    onClick={() => toggleExpand(p)}
                  >
                    <td className="px-3 py-2 text-center">
                      {isExp
                        ? <ChevronDown size={14} style={{ color: COR_VERDE }} />
                        : <ChevronRight size={14} style={{ color: "#9ca3af" }} />
                      }
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold" style={{ color: COR_VERDE }}>
                      #{p.numero_pedido}
                    </td>
                    <td className="px-3 py-2 text-xs">{fmtDate(p.data_emissao)}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(p.previsao_embarque)}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.cliente_fantasia?.trim() || p.cliente_nome || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.cliente_cidade && p.cliente_uf ? `${p.cliente_cidade}/${p.cliente_uf}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-medium">
                      {p.total_qtd ?? "—"}
                      {pctInline !== null && !isExp && (
                        <div style={{
                          marginTop: 2, height: 3, background: "#dcfce7", borderRadius: 2, overflow: "hidden",
                        }}>
                          <div style={{ width: `${pctInline}%`, height: "100%", background: COR_VERDE, borderRadius: 2 }} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-semibold" style={{ color: COR_VERDE }}>
                      {fmtMoeda(p.total_pedido_venda)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <BadgeSituacao situacao={p.situacao_entrega} />
                    </td>
                  </tr>

                  {isExp && (
                    <tr style={{ background: "#f0fdf4" }}>
                      <td colSpan={9} className="px-8 py-4">

                        {/* Rastreamento de Produção */}
                        <RastreamentoProducao
                          pedido={p}
                          maquinas={maquinas}
                          loading={loadingProd}
                        />

                        {/* Divisor */}
                        {itens.length > 0 && (
                          <div style={{ borderTop: "1px solid #bbf7d0", marginBottom: 12 }} />
                        )}

                        {/* Itens do pedido */}
                        {itens.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sem itens registrados.</span>
                        ) : (
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                                {["Produto", "UN", "Qtd.", "Valor Unit.", "Desconto", "Total"].map(h => (
                                  <th key={h} className={`py-1.5 pr-4 text-xs font-semibold ${h === "Produto" ? "text-left" : h === "UN" ? "text-center" : "text-right"}`} style={{ color: COR_VERDE }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {itens.map((item, j) => (
                                <tr key={j} style={{ borderBottom: j < itens.length - 1 ? "1px solid #dcfce7" : "none" }}>
                                  <td className="py-1.5 pr-4 font-medium">{item.produto}</td>
                                  <td className="py-1.5 pr-4 text-center text-muted-foreground">{item.un}</td>
                                  <td className="py-1.5 pr-4 text-right">{item.qtd}</td>
                                  <td className="py-1.5 pr-4 text-right">{fmtMoeda(item.valor_un)}</td>
                                  <td className="py-1.5 pr-4 text-right">{item.percentual_desconto > 0 ? `${item.percentual_desconto}%` : "—"}</td>
                                  <td className="py-1.5 text-right font-semibold" style={{ color: COR_VERDE }}>{fmtMoeda(item.valor_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Exibindo {pagina * PER_PAGE + 1}–{Math.min((pagina + 1) * PER_PAGE, total)} de {total} pedidos
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={pagina === 0}
              onClick={() => setPagina(p => p - 1)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 6, fontSize: 12,
                border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", cursor: pagina === 0 ? "not-allowed" : "pointer",
                opacity: pagina === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={13} /> Anterior
            </button>
            <span style={{ padding: "5px 12px", fontWeight: 600, color: "#374151" }}>
              {pagina + 1} / {totalPaginas}
            </span>
            <button
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina(p => p + 1)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 6, fontSize: 12,
                border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", cursor: pagina >= totalPaginas - 1 ? "not-allowed" : "pointer",
                opacity: pagina >= totalPaginas - 1 ? 0.4 : 1,
              }}
            >
              Próximo <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
