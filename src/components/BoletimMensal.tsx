"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_CONCREM_B64 } from "@/lib/logoBase64";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Registro {
  maquina: string | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  espessura_mm: number | null;
  nucleo: string | null;
  linha: string | null;
  padrao: string | null;
  esp_regua_cm: number | null;
  esp_aba_cm: number | null;
  largura_perfil: string | null;
  produto: string | null;
  qtd_conforme: number | null;
}

type Dim = { dim: string; qtd: number };

interface Secao {
  porDim: Dim[];
  porNucleo: Dim[];
  total: number;
}

interface BoletimData {
  portas: Secao;
  batentes: { porDim: Dim[]; total: number };
  alizares: { porDim: Dim[]; total: number };
  rodapes: { porDim: Dim[]; total: number };
  colagem: Secao;
  gaidzinski: {
    batente: Dim[];
    batentePivotante: Dim[];
    alizar: Dim[];
    baguete: Dim[];
    rodape: Dim[];
    totalBatente: number;
  };
  unesa: {
    alizar: Dim[];
    regua: Dim[];
    batentePivotante: Dim[];
    baguete: Dim[];
    totalAlizar: number;
    totalRegua: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VERDE = "hsl(var(--primary))";
const LINE  = "hsl(var(--border))";
const MUTED = "hsl(var(--muted-foreground))";
const INK   = "hsl(var(--foreground))";


function fmtNum(n: number) { return n.toLocaleString("pt-BR"); }

function addQtd(map: Record<string, number>, key: string, qtd: number) {
  if (!key || key === "nullxnull" || key === "null") return;
  map[key] = (map[key] ?? 0) + qtd;
}

function toRows(map: Record<string, number>): Dim[] {
  return Object.entries(map)
    .map(([dim, qtd]) => ({ dim, qtd }))
    .sort((a, b) => {
      const na = parseFloat(a.dim); const nb = parseFloat(b.dim);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.dim.localeCompare(b.dim);
    });
}

function processData(rows: Registro[]): BoletimData {
  const portasLarg: Record<string, number> = {};
  const portasNuc:  Record<string, number> = {};
  const batentesDim: Record<string, number> = {};
  const alizaresDim: Record<string, number> = {};
  const rodapesDim:  Record<string, number> = {};
  const colagemLarg: Record<string, number> = {};
  const colagemNuc:  Record<string, number> = {};
  const gaiBatente:   Record<string, number> = {};
  const gaiBatentePiv: Record<string, number> = {};
  const gaiAlizar:    Record<string, number> = {};
  const gaiBaguete:   Record<string, number> = {};
  const gaiRodape:    Record<string, number> = {};
  const unAlizar:     Record<string, number> = {};
  const unRegua:      Record<string, number> = {};
  const unBatentePiv: Record<string, number> = {};
  const unBaguete:    Record<string, number> = {};

  for (const r of rows) {
    const m = (r.maquina ?? "").toLowerCase();
    const qtd = Number(r.qtd_conforme) || 0;
    if (qtd === 0) continue;

    // ── PORTAS (Prensa Fria)
    if (m.includes("prensa fria") || m.includes("prensa_fria")) {
      const larg = r.largura_cm != null ? String(r.largura_cm) : null;
      const nuc  = [r.linha, r.nucleo].filter(Boolean).join("-") || null;
      if (larg) addQtd(portasLarg, larg, qtd);
      if (nuc)  addQtd(portasNuc,  nuc,  qtd);
    }
    // ── BATENTES (Moldureira de Batente)
    else if (m.includes("moldureira") && m.includes("batente")) {
      const larg = r.largura_cm != null ? String(r.largura_cm) : null;
      if (larg) addQtd(batentesDim, larg, qtd);
    }
    // ── ALIZARES (Coladeira de Alizar)
    else if (m.includes("coladeira") && m.includes("alizar")) {
      const reg = r.esp_regua_cm != null ? String(r.esp_regua_cm) : null;
      const aba = r.esp_aba_cm   != null ? String(r.esp_aba_cm)   : null;
      const dim = reg && aba ? `${reg}x${aba}` : reg ?? aba ?? null;
      if (dim) addQtd(alizaresDim, dim, qtd);
    }
    // ── ALIZARES também da Moldureira de Alizar
    else if (m.includes("moldureira") && m.includes("aliz")) {
      const larg = r.largura_cm != null ? String(r.largura_cm / 10) : null;
      const esp  = r.espessura_mm != null ? String(r.espessura_mm) : null;
      const dim  = larg && esp ? `${larg}x${esp}` : larg ?? null;
      if (dim) addQtd(alizaresDim, dim, qtd);
    }
    // ── RODAPES
    else if (m.includes("rodap")) {
      const larg = r.largura_cm != null ? String(r.largura_cm) : null;
      if (larg) addQtd(rodapesDim, larg, qtd);
    }
    // ── COLAGEM DE BORDAS
    else if (m.includes("colagem") && m.includes("borda")) {
      const larg = r.largura_cm != null ? String(r.largura_cm) : null;
      const nuc  = [r.linha, r.nucleo].filter(Boolean).join("-") || null;
      if (larg) addQtd(colagemLarg, larg, qtd);
      if (nuc)  addQtd(colagemNuc,  nuc,  qtd);
    }
    // ── GAIDZINSKI
    else if (m.includes("gaidzinski")) {
      const lp = r.largura_perfil ?? "";
      const prod = (r.produto ?? "").toLowerCase();
      if (prod.includes("batente") && prod.includes("pivotante")) {
        addQtd(gaiBatentePiv, lp, qtd);
      } else if (prod.includes("batente")) {
        addQtd(gaiBatente, lp, qtd);
      } else if (prod.includes("alizar")) {
        addQtd(gaiAlizar, lp, qtd);
      } else if (prod.includes("baguete")) {
        addQtd(gaiBaguete, lp, qtd);
      } else if (prod.includes("rodap")) {
        addQtd(gaiRodape, lp, qtd);
      }
    }
    // ── UNESA
    else if (m.includes("unesa")) {
      const lp   = r.largura_perfil ?? "";
      const prod = (r.produto ?? "").toLowerCase();
      if (prod.includes("alizar")) {
        addQtd(unAlizar, lp, qtd);
      } else if (prod.includes("regua") || prod.includes("régua")) {
        addQtd(unRegua, lp, qtd);
      } else if (prod.includes("pivotante")) {
        addQtd(unBatentePiv, lp, qtd);
      } else if (prod.includes("baguete")) {
        addQtd(unBaguete, lp, qtd);
      }
    }
  }

  const sumMap = (m: Record<string, number>) => Object.values(m).reduce((s, v) => s + v, 0);

  return {
    portas: {
      porDim:    toRows(portasLarg),
      porNucleo: toRows(portasNuc),
      total:     sumMap(portasLarg),
    },
    batentes: { porDim: toRows(batentesDim), total: sumMap(batentesDim) },
    alizares: { porDim: toRows(alizaresDim), total: sumMap(alizaresDim) },
    rodapes:  { porDim: toRows(rodapesDim),  total: sumMap(rodapesDim)  },
    colagem: {
      porDim:    toRows(colagemLarg),
      porNucleo: toRows(colagemNuc),
      total:     sumMap(colagemLarg),
    },
    gaidzinski: {
      batente:       toRows(gaiBatente),
      batentePivotante: toRows(gaiBatentePiv),
      alizar:        toRows(gaiAlizar),
      baguete:       toRows(gaiBaguete),
      rodape:        toRows(gaiRodape),
      totalBatente:  sumMap(gaiBatente),
    },
    unesa: {
      alizar:        toRows(unAlizar),
      regua:         toRows(unRegua),
      batentePivotante: toRows(unBatentePiv),
      baguete:       toRows(unBaguete),
      totalAlizar:   sumMap(unAlizar),
      totalRegua:    sumMap(unRegua),
    },
  };
}

// ─── Componentes visuais ──────────────────────────────────────────────────────

function SecaoTable({ title, rows, totalLabel = "Total" }: {
  title: string;
  rows: Dim[];
  totalLabel?: string;
}) {
  const total = rows.reduce((s, r) => s + r.qtd, 0);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: VERDE, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "hsl(var(--muted))" }}>
            <th style={{ padding: "4px 8px", textAlign: "left",  fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>Larg.</th>
            <th style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={2} style={{ padding: "8px", color: MUTED, textAlign: "center", fontSize: 10 }}>Sem dados</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "hsl(var(--muted)/0.3)" }}>
              <td style={{ padding: "3px 8px", color: INK }}>{r.dim}</td>
              <td style={{ padding: "3px 8px", color: INK, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(r.qtd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `1px solid ${LINE}` }}>
            <td style={{ padding: "4px 8px", fontWeight: 700, color: VERDE, fontSize: 10, textTransform: "uppercase" }}>{totalLabel}</td>
            <td style={{ padding: "4px 8px", fontWeight: 700, color: VERDE, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SecaoDupla({ title, left, right, leftLabel = "Por Largura", rightLabel = "Por Núcleo" }: {
  title: string;
  left: Dim[];
  right: Dim[];
  leftLabel?: string;
  rightLabel?: string;
}) {
  const total = left.reduce((s, r) => s + r.qtd, 0);
  return (
    <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: VERDE, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
        <span style={{ fontSize: 11, color: MUTED }}>Total: <strong style={{ color: INK }}>{fmtNum(total)}</strong></span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <SecaoTable title={leftLabel}  rows={left}  />
        <SecaoTable title={rightLabel} rows={right} />
      </div>
    </div>
  );
}

function SecaoSimples({ title, rows, subtitle }: { title: string; rows: Dim[]; subtitle?: string }) {
  const total = rows.reduce((s, r) => s + r.qtd, 0);
  return (
    <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: VERDE, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
        {subtitle && <span style={{ fontSize: 10, color: MUTED }}>{subtitle}</span>}
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
          Total: <strong style={{ color: INK }}>{fmtNum(total)}</strong>
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "hsl(var(--muted))" }}>
            <th style={{ padding: "4px 8px", textAlign: "left",  fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>Dim.</th>
            <th style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={2} style={{ padding: "8px", color: MUTED, textAlign: "center", fontSize: 10 }}>Sem dados no período</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "hsl(var(--muted)/0.3)" }}>
              <td style={{ padding: "3px 8px", color: INK }}>{r.dim}</td>
              <td style={{ padding: "3px 8px", color: INK, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(r.qtd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `1px solid ${LINE}` }}>
            <td style={{ padding: "4px 8px", fontWeight: 700, color: VERDE, fontSize: 10, textTransform: "uppercase" }}>Total</td>
            <td style={{ padding: "4px 8px", fontWeight: 700, color: VERDE, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function gerarPDF(dados: BoletimData, range: DateRange) {
  const doc = new jsPDF({ orientation: "landscape" });
  const green: [number, number, number] = [26, 91, 46];
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const periodoLabel = range.from
    ? range.to
      ? `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
      : format(range.from, "dd/MM/yyyy")
    : "";

  // Cabeçalho
  doc.addImage(LOGO_CONCREM_B64, "PNG", margin, 6, 60, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("RELATÓRIO GERAL MENSAL", pageW / 2, 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(periodoLabel, pageW / 2, 18, { align: "center" });
  doc.setFillColor(...green);
  doc.rect(margin, 22, pageW - margin * 2, 0.6, "F");

  const buildBody = (rows: Dim[]) => rows.map(r => [r.dim, r.qtd.toLocaleString("pt-BR")]);
  const hStyle = { fillColor: green, textColor: [255,255,255] as [number,number,number], fontStyle: "bold" as const };
  const altStyle = { fillColor: [242,247,242] as [number,number,number] };
  const opts = { styles: { fontSize: 7.5, cellPadding: 1.8 }, headStyles: hStyle, alternateRowStyles: altStyle };

  let y = 26;
  const col = (pageW - margin * 2) / 4 - 2;

  // Row 1: Portas + Batentes + Alizares + Rodapés
  autoTable(doc, { ...opts, startY: y, tableWidth: col * 1.5, margin: { left: margin },
    head: [["PORTAS (PRENSAS) — Por Largura", "Qtd"]], body: [
      ...buildBody(dados.portas.porDim),
      ["TOTAL", dados.portas.total.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y, tableWidth: col * 1.5, margin: { left: margin + col * 1.5 + 2 },
    head: [["PORTAS — Por Núcleo", "Qtd"]], body: buildBody(dados.portas.porNucleo) });

  const y2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  autoTable(doc, { ...opts, startY: y2, tableWidth: col, margin: { left: margin },
    head: [["BATENTES (Moldureira)", "Qtd"]], body: [
      ...buildBody(dados.batentes.porDim),
      ["TOTAL", dados.batentes.total.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y2, tableWidth: col, margin: { left: margin + col + 2 },
    head: [["ALIZARES (Coladeira)", "Qtd"]], body: [
      ...buildBody(dados.alizares.porDim),
      ["TOTAL", dados.alizares.total.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y2, tableWidth: col, margin: { left: margin + col * 2 + 4 },
    head: [["RODAPÉS (Moldureira)", "Qtd"]], body: [
      ...buildBody(dados.rodapes.porDim),
      ["TOTAL", dados.rodapes.total.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y2, tableWidth: col, margin: { left: margin + col * 3 + 6 },
    head: [["COLAGEM DE BORDAS", "Qtd"]], body: [
      ...buildBody(dados.colagem.porDim),
      ["TOTAL", dados.colagem.total.toLocaleString("pt-BR")],
    ] });

  // Página 2 — Recobrimento
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(margin, 8, pageW - margin * 2, 0.6, "F");
  let y3 = 12;

  autoTable(doc, { ...opts, startY: y3, tableWidth: col, margin: { left: margin },
    head: [["GAIDZINSKI — Batente C/Borracha", "Qtd"]], body: [
      ...buildBody(dados.gaidzinski.batente),
      ["TOTAL", dados.gaidzinski.totalBatente.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y3, tableWidth: col, margin: { left: margin + col + 2 },
    head: [["GAIDZINSKI — Bat. Pivotante", "Qtd"]], body: buildBody(dados.gaidzinski.batentePivotante) });
  autoTable(doc, { ...opts, startY: y3, tableWidth: col * 1.5, margin: { left: margin + col * 2 + 4 },
    head: [["UNESA — Alizar", "Qtd"]], body: [
      ...buildBody(dados.unesa.alizar),
      ["TOTAL", dados.unesa.totalAlizar.toLocaleString("pt-BR")],
    ] });
  autoTable(doc, { ...opts, startY: y3, tableWidth: col, margin: { left: margin + col * 3.5 + 6 },
    head: [["UNESA — Régua", "Qtd"]], body: [
      ...buildBody(dados.unesa.regua),
      ["TOTAL", dados.unesa.totalRegua.toLocaleString("pt-BR")],
    ] });

  const y4 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  autoTable(doc, { ...opts, startY: y4, tableWidth: col, margin: { left: margin },
    head: [["UNESA — Bat. Pivotante", "Qtd"]], body: buildBody(dados.unesa.batentePivotante) });
  autoTable(doc, { ...opts, startY: y4, tableWidth: col, margin: { left: margin + col + 2 },
    head: [["UNESA — Baguete", "Qtd"]], body: buildBody(dados.unesa.baguete) });

  // Rodapé com páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(160,160,160);
    doc.text(`Página ${p} de ${total}  —  Concrem Portas Premium`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
  }

  const slug = range.from ? format(range.from, "yyyy-MM") : "boletim";
  doc.save(`boletim-mensal-${slug}.pdf`);
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function BoletimMensal() {
  const hoje = new Date();
  const [range, setRange]     = useState<DateRange | undefined>({
    from: startOfMonth(hoje),
    to:   endOfMonth(hoje),
  });
  const [popOpen, setPopOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dados, setDados]     = useState<BoletimData | null>(null);

  const buscar = useCallback(async (r?: DateRange) => {
    const sel = r ?? range;
    if (!sel?.from) return;
    setLoading(true);
    const inicio = format(sel.from, "yyyy-MM-dd");
    const fim    = format(sel.to ?? sel.from, "yyyy-MM-dd");

    const TAM = 1000;
    let pagina = 0;
    const todos: Registro[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina,largura_cm,comprimento_cm,espessura_mm,nucleo,linha,padrao,esp_regua_cm,esp_aba_cm,largura_perfil,produto,qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (error || !data || data.length === 0) break;
      todos.push(...(data as Registro[]));
      if (data.length < TAM) break;
      pagina++;
    }

    setDados(processData(todos));
    setLoading(false);
  }, [range]);

  useEffect(() => { void buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const labelPeriodo = range?.from
    ? range.to
      ? `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`
      : format(range.from, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar período";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Controles ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

        {/* Date range picker */}
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs font-normal min-w-[220px] justify-start"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{labelPeriodo}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="flex justify-end gap-2 p-3 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setPopOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!range?.from}
                onClick={() => { setPopOpen(false); void buscar(range); }}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="sm" variant="outline" onClick={() => void buscar()} disabled={loading} className="h-8 gap-1.5">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </Button>

        {dados && range && (
          <Button size="sm" onClick={() => gerarPDF(dados, range)} className="h-8 gap-1.5 ml-auto">
            <FileText className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <SpinnerCustom />
        </div>
      ) : !dados ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── Linha 1: Portas ── */}
          <SecaoDupla
            title="Portas (Prensas)"
            left={dados.portas.porDim}
            right={dados.portas.porNucleo}
            leftLabel="Por Largura (cm)"
            rightLabel="Por Núcleo"
          />

          {/* ── Linha 2: Batentes + Alizares + Rodapés + Colagem ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <SecaoSimples title="Batentes" subtitle="Moldureira" rows={dados.batentes.porDim} />
            <SecaoSimples title="Alizares" subtitle="Coladeira 01 e 02" rows={dados.alizares.porDim} />
            <SecaoSimples title="Rodapés" subtitle="Moldureira" rows={dados.rodapes.porDim} />
            <SecaoSimples title="Colagem de Bordas" rows={dados.colagem.porDim} />
          </div>

          {/* ── Linha 3: Recobrimento ── */}
          <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: VERDE, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Recobrimento de Perfil — Fábrica 01
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              <SecaoTable title="Gaidzinski — Batente C/Borracha" rows={dados.gaidzinski.batente} />
              <SecaoTable title="Gaidzinski — Bat. Pivotante"     rows={dados.gaidzinski.batentePivotante} />
              {dados.gaidzinski.alizar.length  > 0 && <SecaoTable title="Gaidzinski — Alizar"  rows={dados.gaidzinski.alizar}  />}
              {dados.gaidzinski.baguete.length > 0 && <SecaoTable title="Gaidzinski — Baguete" rows={dados.gaidzinski.baguete} />}
              {dados.gaidzinski.rodape.length  > 0 && <SecaoTable title="Gaidzinski — Rodapé"  rows={dados.gaidzinski.rodape}  />}
              <SecaoTable title="UNESA — Alizar"        rows={dados.unesa.alizar}        />
              <SecaoTable title="UNESA — Régua"         rows={dados.unesa.regua}         />
              <SecaoTable title="UNESA — Bat. Pivotante" rows={dados.unesa.batentePivotante} />
              {dados.unesa.baguete.length > 0 && <SecaoTable title="UNESA — Baguete" rows={dados.unesa.baguete} />}
            </div>
          </div>

        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .boletim-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .boletim-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
