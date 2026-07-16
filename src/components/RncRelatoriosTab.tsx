"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  Plus, Pencil, Trash2, Printer, Loader2, FileText, CheckCircle2, Clock, FolderOpen, ExternalLink,
} from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RASCUNHO_RNC_KEY, type RascunhoRnc } from "@/lib/qualidade-integracao";

const COR_VERDE = "hsl(var(--primary))";

const FAMILIAS_NC = [
  "NÃO CONFORMIDADES DE AUDITORIA",
  "NÃO CONFORMIDADES DE FORNECEDOR",
  "NÃO CONFORMIDADE DE EQUIPAMENTOS DE MEDIÇÃO",
  "NÃO CONFORMIDADE DE RECLAMAÇÃO DE CLIENTES",
  "NÃO CONFORMIDADE DE PROBLEMAS NA OBRA",
  "NÃO CONFORMIDADE DE PROCESSO",
];

interface RncRelatorio {
  id: string;
  numero_rnc: string;
  processo_cliente: string;
  lote_numero_pedido: string | null;
  obra: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  nota_fiscal: string | null;
  via_transportadora: boolean;
  via_representante: boolean;
  nome_representante: string | null;
  data_entrega_pedido: string | null;
  verificacao_entrega: "sim" | "nao" | "nao_aplicavel" | null;
  familia_nc: number | null;
  reclamacao_descricao: string | null;
  requisito: string | null;
  investigacao: string | null;
  evidencia: string | null;
  evidencia_url: string | null;
  responsavel: string | null;
  visto: string | null;
  data_responsavel: string | null;
  status: "aberto" | "fechado";
  created_at: string;
  criticidade: "baixa" | "media" | "alta" | "critica" | null;
  plano_acao_id: number | null;
}

const CRITICIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

const CRITICIDADE_CLASSES: Record<string, string> = {
  baixa:   "bg-slate-100 text-slate-600 border-slate-200",
  media:   "bg-amber-50 text-amber-600 border-amber-200",
  alta:    "bg-orange-50 text-orange-600 border-orange-200",
  critica: "bg-red-50 text-red-700 border-red-200",
};

const FORM_VAZIO: Omit<RncRelatorio, "id" | "created_at" | "numero_rnc"> = {
  processo_cliente: "",
  lote_numero_pedido: "",
  obra: "",
  data_abertura: format(new Date(), "yyyy-MM-dd"),
  data_fechamento: "",
  nota_fiscal: "",
  via_transportadora: false,
  via_representante: false,
  nome_representante: "",
  data_entrega_pedido: "",
  verificacao_entrega: null,
  familia_nc: null,
  reclamacao_descricao: "",
  requisito: "",
  investigacao: "",
  evidencia: "",
  evidencia_url: "",
  responsavel: "",
  visto: "",
  data_responsavel: format(new Date(), "yyyy-MM-dd"),
  status: "aberto",
  criticidade: null,
  plano_acao_id: null,
};

// ─── Geração do HTML para impressão ──────────────────────────────────────────

function generateRncHtml(rnc: RncRelatorio, origin: string): string {
  const fmtDate = (d: string | null) =>
    d ? format(new Date(d + "T00:00:00"), "dd/MM/yyyy") : "";

  const chk = (cond: boolean) =>
    `<span style="display:inline-block;width:11px;height:11px;border:1px solid #000;text-align:center;line-height:11px;font-size:9px;${cond ? "background:#1a5c2e;color:#fff;" : ""}vertical-align:middle">${cond ? "X" : ""}</span>`;

  const familiasLinhas = [
    ...FAMILIAS_NC.map((f, i) => ({ num: i + 1, desc: f })),
    ...[7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => ({ num: n, desc: "" })),
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>AQ037 – RNC/AC ${rnc.numero_rnc}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:10px; color:#000; background:#fff; }
table { width:100%; border-collapse:collapse; }
td, th { border:1px solid #000; padding:4px 6px; vertical-align:top; font-size:10px; }
th { background:#d4edda; font-weight:bold; }
.rnc-num { font-size:24px; font-weight:bold; text-align:center; }
.bold { font-weight:bold; }
.section-body { min-height:55px; padding:4px 0; }
.footer-row td { padding:6px; }
.page { padding:16px 18px; max-width:210mm; margin:0 auto; }
@page { size: A4; margin: 0; }
@media print { body{margin:0} .page{padding:10mm 12mm} }
</style>
</head>
<body>
<div class="page">

<!-- ── CABEÇALHO AQ037 (padrão procedimento) ── -->
<table>
  <tr>
    <td rowspan="2" style="width:22%;text-align:center;padding:6px 8px;vertical-align:middle">
      <img src="${origin}/logo-concrem.png" alt="Concrem" style="max-height:50px;max-width:150px;object-fit:contain" />
    </td>
    <td style="text-align:center;font-size:10px;padding:4px 8px">
      ANEXO DA QUALIDADE
    </td>
    <td colspan="2" style="text-align:center;font-size:10px;padding:4px 8px">
      <div>Código</div>
      <div style="font-weight:bold">AQ037</div>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;font-weight:bold;font-size:10px;padding:4px 8px">
      RELATÓRIO DE NÃO CONFORMIDADE<br>
      RECLAMAÇÃO DE CLIENTES<br>
      AÇÃO CORRETIVA
    </td>
    <td style="text-align:center;font-size:10px;padding:4px 6px;width:11%">
      <div>Revisão</div>
      <div style="font-weight:bold">01</div>
    </td>
    <td style="text-align:center;font-size:10px;padding:4px 6px;width:13%">
      <div>Data</div>
      <div style="font-weight:bold">03/06/2019</div>
    </td>
  </tr>
</table>

<!-- ── RNC/AC Nº ── -->
<table style="margin-top:2px">
  <tr>
    <td style="width:75%">&nbsp;</td>
    <td style="width:25%;text-align:center">
      <div style="font-size:9px;font-weight:bold">RNC/AC Nº:</div>
      <div class="rnc-num">${rnc.numero_rnc}</div>
    </td>
  </tr>
</table>

<!-- ── DADOS ── -->
<table style="margin-top:2px">
  <tr>
    <td style="width:50%"><span class="bold">Processo/Cliente: </span>${rnc.processo_cliente}</td>
    <td style="width:50%"><span class="bold">Lote/ Nº do pedido: </span>${rnc.lote_numero_pedido || ""}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="bold">Obra: </span>${rnc.obra || ""}</td>
  </tr>
  <tr>
    <td><span class="bold">Data de abertura: </span>${fmtDate(rnc.data_abertura)}</td>
    <td><span class="bold">Data de fechamento: </span>${fmtDate(rnc.data_fechamento)}</td>
  </tr>
  <tr>
    <td><span class="bold">Nota fiscal: </span>${rnc.nota_fiscal || ""}</td>
    <td>
      <span class="bold">Transportadora </span>${chk(rnc.via_transportadora)}&nbsp;&nbsp;
      <span class="bold">Representante </span>${chk(rnc.via_representante)}
      ${rnc.nome_representante ? `: ${rnc.nome_representante}` : ""}
    </td>
  </tr>
  <tr>
    <td><span class="bold">Data de entrega do pedido: </span>${fmtDate(rnc.data_entrega_pedido)}</td>
    <td>
      <span class="bold">Verificação no ato da entrega&nbsp;</span>
      ${chk(rnc.verificacao_entrega === "sim")} Sim&nbsp;&nbsp;
      ${chk(rnc.verificacao_entrega === "nao")} Não&nbsp;&nbsp;
      ${chk(rnc.verificacao_entrega === "nao_aplicavel")} Não aplicável
    </td>
  </tr>
</table>

<!-- ── FAMÍLIA NC ── -->
<table style="margin-top:6px">
  <tr><th colspan="3" style="text-align:left">ASSINALE A FAMÍLIA DA NÃO CONFORMIDADE:</th></tr>
  <tr>
    <th style="width:6%">X</th>
    <th style="width:8%">Nº</th>
    <th>Descrição:</th>
  </tr>
  ${familiasLinhas.map(f => `
  <tr>
    <td style="text-align:center">${rnc.familia_nc === f.num ? "<strong>X</strong>" : ""}</td>
    <td style="text-align:center">${String(f.num).padStart(2, "0")}</td>
    <td>${f.desc}</td>
  </tr>`).join("")}
</table>

<!-- ── CAMPOS DE TEXTO ── -->
<table style="margin-top:4px">
  <tr><td>
    <div class="bold">Reclamação/ Sugestão/ Não conformidade:</div>
    <div class="section-body">${(rnc.reclamacao_descricao || "").replace(/\n/g, "<br>")}</div>
  </td></tr>
  <tr><td>
    <div class="bold">Requisito: (Requisito da Norma ou Procedimento Interno):</div>
    <div class="section-body">${(rnc.requisito || "").replace(/\n/g, "<br>")}</div>
  </td></tr>
  <tr><td>
    <div class="bold">Investigação:</div>
    <div class="section-body">${(rnc.investigacao || "").replace(/\n/g, "<br>")}</div>
  </td></tr>
  <tr><td>
    <div class="bold">Evidência:</div>
    <div class="section-body">
      ${(rnc.evidencia || "").replace(/\n/g, "<br>")}
      ${rnc.evidencia_url ? `<div style="margin-top:6px"><span style="font-weight:bold">&#128193; Pasta de evidências (Drive): </span><a href="${rnc.evidencia_url}" style="color:#1a5c2e;word-break:break-all">${rnc.evidencia_url}</a></div>` : ""}
    </div>
  </td></tr>
  <tr class="footer-row"><td>
    <div style="display:flex;gap:48px">
      <div><span class="bold">Responsável: </span>${rnc.responsavel || ""}</div>
      <div><span class="bold">Visto: </span>${rnc.visto || ""}</div>
      <div><span class="bold">Data: </span>${fmtDate(rnc.data_responsavel)}</div>
    </div>
  </td></tr>
</table>

</div>
</body>
</html>`;
}

// ─── Auto-numeração ───────────────────────────────────────────────────────────

async function gerarNumeroRnc(): Promise<string> {
  const ano2 = String(new Date().getFullYear()).slice(-2);
  const { data } = await supabase
    .from("rnc_relatorios")
    .select("numero_rnc")
    .ilike("numero_rnc", `%/${ano2}`);

  let max = 0;
  for (const row of data ?? []) {
    const n = parseInt(row.numero_rnc.split("/")[0], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${max + 1}/${ano2}`;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RncRelatoriosTab() {
  const [relatorios, setRelatorios] = useState<RncRelatorio[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando]     = useState<RncRelatorio | null>(null);
  const [form, setForm]             = useState({ ...FORM_VAZIO, numero_rnc: "" });
  const [salvando, setSalvando]     = useState(false);
  const [deletarId, setDeletarId]   = useState<string | null>(null);
  const [gerandoNum, setGerandoNum] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const buscar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rnc_relatorios")
      .select("*")
      .order("data_abertura", { ascending: false });
    setRelatorios((data as RncRelatorio[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void buscar(); }, [buscar]);

  // ── Abrir para criar ───────────────────────────────────────────────────────

  const abrirNovo = async () => {
    setGerandoNum(true);
    const num = await gerarNumeroRnc();
    setGerandoNum(false);
    setEditando(null);
    setForm({
      ...FORM_VAZIO,
      numero_rnc: num,
      data_abertura: format(new Date(), "yyyy-MM-dd"),
      data_responsavel: format(new Date(), "yyyy-MM-dd"),
    });
    setDialogAberto(true);
  };

  const abrirEditar = (r: RncRelatorio) => {
    setEditando(r);
    setForm({
      numero_rnc:          r.numero_rnc,
      processo_cliente:    r.processo_cliente,
      lote_numero_pedido:  r.lote_numero_pedido ?? "",
      obra:                r.obra ?? "",
      data_abertura:       r.data_abertura,
      data_fechamento:     r.data_fechamento ?? "",
      nota_fiscal:         r.nota_fiscal ?? "",
      via_transportadora:  r.via_transportadora,
      via_representante:   r.via_representante,
      nome_representante:  r.nome_representante ?? "",
      data_entrega_pedido: r.data_entrega_pedido ?? "",
      verificacao_entrega: r.verificacao_entrega,
      familia_nc:          r.familia_nc,
      reclamacao_descricao: r.reclamacao_descricao ?? "",
      requisito:           r.requisito ?? "",
      investigacao:        r.investigacao ?? "",
      evidencia:           r.evidencia ?? "",
      evidencia_url:       r.evidencia_url ?? "",
      responsavel:         r.responsavel ?? "",
      visto:               r.visto ?? "",
      data_responsavel:    r.data_responsavel ?? "",
      status:              r.status,
      criticidade:         r.criticidade,
      plano_acao_id:       r.plano_acao_id,
    });
    setDialogAberto(true);
  };

  // ── Pré-preenchimento vindo de outra página (ex.: Gramatura fora da faixa,
  // Inspeção reprovada) — ver src/lib/qualidade-integracao.ts
  useEffect(() => {
    const raw = sessionStorage.getItem(RASCUNHO_RNC_KEY);
    if (!raw) return;
    sessionStorage.removeItem(RASCUNHO_RNC_KEY);
    try {
      const rascunho = JSON.parse(raw) as RascunhoRnc;
      (async () => {
        setGerandoNum(true);
        const num = await gerarNumeroRnc();
        setGerandoNum(false);
        setEditando(null);
        setForm({
          ...FORM_VAZIO,
          ...rascunho,
          numero_rnc: num,
          data_abertura: format(new Date(), "yyyy-MM-dd"),
          data_responsavel: format(new Date(), "yyyy-MM-dd"),
        });
        setDialogAberto(true);
      })();
    } catch {
      // rascunho inválido — ignora silenciosamente
    }
  }, []);

  // ── Salvar ─────────────────────────────────────────────────────────────────

  const handleSalvar = async () => {
    if (!form.processo_cliente.trim()) {
      toast.error("Informe o processo/cliente.");
      return;
    }
    setSalvando(true);

    const payload = {
      numero_rnc:          form.numero_rnc,
      processo_cliente:    form.processo_cliente.trim(),
      lote_numero_pedido:  form.lote_numero_pedido || null,
      obra:                form.obra || null,
      data_abertura:       form.data_abertura,
      data_fechamento:     form.data_fechamento || null,
      nota_fiscal:         form.nota_fiscal || null,
      via_transportadora:  form.via_transportadora,
      via_representante:   form.via_representante,
      nome_representante:  form.nome_representante || null,
      data_entrega_pedido: form.data_entrega_pedido || null,
      verificacao_entrega: form.verificacao_entrega,
      familia_nc:          form.familia_nc,
      reclamacao_descricao: form.reclamacao_descricao || null,
      requisito:           form.requisito || null,
      investigacao:        form.investigacao || null,
      evidencia:           form.evidencia || null,
      evidencia_url:       form.evidencia_url || null,
      responsavel:         form.responsavel || null,
      visto:               form.visto || null,
      data_responsavel:    form.data_responsavel || null,
      status:              form.status,
      criticidade:         form.criticidade,
      plano_acao_id:       form.plano_acao_id,
      updated_at:          new Date().toISOString(),
    };

    let error;
    if (editando) {
      ({ error } = await supabase.from("rnc_relatorios").update(payload).eq("id", editando.id));
    } else {
      ({ error } = await supabase.from("rnc_relatorios").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(editando ? "Relatório atualizado." : "Relatório criado.");
      setDialogAberto(false);
      void buscar();
    }
    setSalvando(false);
  };

  // ── Deletar ────────────────────────────────────────────────────────────────

  const handleDeletar = async () => {
    if (!deletarId) return;
    const { error } = await supabase.from("rnc_relatorios").delete().eq("id", deletarId);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success("Relatório excluído."); void buscar(); }
    setDeletarId(null);
  };

  // ── Imprimir ───────────────────────────────────────────────────────────────

  const handlePrint = (rnc: RncRelatorio) => {
    const html = generateRncHtml(rnc, window.location.origin);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }
  };

  // ── set helper ────────────────────────────────────────────────────────────

  const set = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Relatórios RNC / Ação Corretiva</p>
          <p className="text-xs text-muted-foreground">Formulário AQ037 – Não Conformidade / Reclamação de Clientes</p>
        </div>
        <Button size="sm" onClick={abrirNovo} disabled={gerandoNum}
          style={{ background: COR_VERDE }} className="text-white hover:opacity-90 gap-1.5">
          {gerandoNum ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo Relatório
        </Button>
      </div>

      {/* ── Tabela de relatórios ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
      ) : relatorios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
            <FileText className="h-9 w-9 opacity-30" />
            <p className="text-sm">Nenhum relatório cadastrado.</p>
            <p className="text-xs">Clique em "Novo Relatório" para criar o primeiro RNC/AC.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: COR_VERDE }}>
                    {["RNC/AC Nº", "Cliente / Processo", "Data Abertura", "Família NC", "Criticidade", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-white whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatorios.map((r, i) => (
                    <tr key={r.id}
                      style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                      <td className="px-4 py-2.5 font-bold text-xs" style={{ color: COR_VERDE }}>
                        {r.numero_rnc}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium max-w-52">
                        <div className="truncate">{r.processo_cliente}</div>
                        {r.obra && <div className="text-muted-foreground truncate">{r.obra}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.data_abertura + "T00:00:00"), "dd/MM/yyyy")}
                        {r.data_fechamento && (
                          <div>Fechado: {format(new Date(r.data_fechamento + "T00:00:00"), "dd/MM/yyyy")}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-44">
                        {r.familia_nc ? (
                          <span className="truncate block">
                            <span className="font-semibold mr-1">{String(r.familia_nc).padStart(2, "0")}.</span>
                            {FAMILIAS_NC[r.familia_nc - 1] ?? `Família ${r.familia_nc}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.criticidade ? (
                          <Badge variant="outline" className={`text-xs ${CRITICIDADE_CLASSES[r.criticidade]}`}>
                            {CRITICIDADE_LABELS[r.criticidade]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.status === "fechado" ? (
                          <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3" /> Fechado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-3 w-3" /> Aberto
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {r.evidencia_url && (
                            <button
                              onClick={() => window.open(r.evidencia_url!, "_blank")}
                              title="Abrir pasta de evidências no Drive"
                              className="p-1.5 rounded hover:bg-green-50 transition-colors"
                              style={{ color: COR_VERDE }}
                            >
                              <FolderOpen className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handlePrint(r)} title="Gerar PDF"
                            className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-700 transition-colors">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button onClick={() => abrirEditar(r)} title="Editar"
                            className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeletarId(r.id)} title="Excluir"
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog de criação/edição ── */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: COR_VERDE }} />
              {editando ? `Editar RNC/AC ${editando.numero_rnc}` : "Novo Relatório RNC/AC (AQ037)"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── Seção 1: Identificação ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: COR_VERDE }}>
                Identificação
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">RNC/AC Nº</Label>
                  <Input value={form.numero_rnc} readOnly className="text-xs font-bold bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Criticidade</Label>
                  <Select value={form.criticidade ?? ""} onValueChange={v => set("criticidade", v || null)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plano de Ação vinculado (nº, opcional)</Label>
                  <Input type="number" value={form.plano_acao_id ?? ""}
                    onChange={e => set("plano_acao_id", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Ex.: 12" className="text-xs" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Processo / Cliente *</Label>
                  <Input value={form.processo_cliente}
                    onChange={e => set("processo_cliente", e.target.value)}
                    placeholder="Nome do cliente, fornecedor ou processo" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lote / Nº do Pedido</Label>
                  <Input value={form.lote_numero_pedido ?? ""}
                    onChange={e => set("lote_numero_pedido", e.target.value)}
                    placeholder="Ex.: 16952" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Obra</Label>
                  <Input value={form.obra ?? ""} onChange={e => set("obra", e.target.value)}
                    placeholder="Nome da obra (ou N/A)" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Abertura</Label>
                  <Input type="date" value={form.data_abertura}
                    onChange={e => set("data_abertura", e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Fechamento</Label>
                  <Input type="date" value={form.data_fechamento ?? ""}
                    onChange={e => set("data_fechamento", e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nota Fiscal</Label>
                  <Input value={form.nota_fiscal ?? ""} onChange={e => set("nota_fiscal", e.target.value)}
                    placeholder="Nº da NF (ou N/A)" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Entrega do Pedido</Label>
                  <Input type="date" value={form.data_entrega_pedido ?? ""}
                    onChange={e => set("data_entrega_pedido", e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Via</Label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <Checkbox checked={form.via_transportadora}
                        onCheckedChange={v => set("via_transportadora", !!v)} />
                      Transportadora
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <Checkbox checked={form.via_representante}
                        onCheckedChange={v => set("via_representante", !!v)} />
                      Representante
                    </label>
                    {form.via_representante && (
                      <Input value={form.nome_representante ?? ""}
                        onChange={e => set("nome_representante", e.target.value)}
                        placeholder="Nome do representante" className="text-xs h-8 flex-1" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Verificação no ato da entrega</Label>
                  <div className="flex items-center gap-4">
                    {(["sim", "nao", "nao_aplicavel"] as const).map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input type="radio" name="verificacao" checked={form.verificacao_entrega === v}
                          onChange={() => set("verificacao_entrega", v)} className="accent-green-700" />
                        {v === "sim" ? "Sim" : v === "nao" ? "Não" : "Não aplicável"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Seção 2: Família NC ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: COR_VERDE }}>
                Família da Não Conformidade
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {FAMILIAS_NC.map((f, i) => (
                  <label key={i}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 text-xs transition-colors"
                    style={form.familia_nc === i + 1 ? { background: "#f0fdf4", border: "1px solid #bbf7d0" } : {}}>
                    <input type="radio" name="familia_nc" checked={form.familia_nc === i + 1}
                      onChange={() => set("familia_nc", i + 1)} className="accent-green-700" />
                    <span className="font-semibold text-muted-foreground w-5">{String(i + 1).padStart(2, "0")}</span>
                    {f}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t" />

            {/* ── Seção 3: Conteúdo ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: COR_VERDE }}>
                Conteúdo do Relatório
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Reclamação / Sugestão / Não Conformidade</Label>
                  <Textarea value={form.reclamacao_descricao ?? ""}
                    onChange={e => set("reclamacao_descricao", e.target.value)}
                    rows={4} placeholder="Descreva a reclamação, sugestão ou não conformidade..." className="text-xs resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Requisito (Norma ou Procedimento Interno)</Label>
                  <Textarea value={form.requisito ?? ""} onChange={e => set("requisito", e.target.value)}
                    rows={2} placeholder="Ex.: PQ014 – Tratamento de reclamações" className="text-xs resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Investigação</Label>
                  <Textarea value={form.investigacao ?? ""} onChange={e => set("investigacao", e.target.value)}
                    rows={4} placeholder="Descreva a investigação realizada..." className="text-xs resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Evidência</Label>
                  <Textarea value={form.evidencia ?? ""} onChange={e => set("evidencia", e.target.value)}
                    rows={2} placeholder="Descreva brevemente a evidência..." className="text-xs resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" style={{ color: COR_VERDE }} />
                    Link da Pasta de Evidências (Google Drive)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.evidencia_url ?? ""}
                      onChange={e => set("evidencia_url", e.target.value)}
                      placeholder="Cole aqui o link da pasta do Drive..."
                      className="text-xs flex-1"
                    />
                    {form.evidencia_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 shrink-0"
                        onClick={() => window.open(form.evidencia_url!, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No Google Drive: clique com botão direito na pasta → Compartilhar → Copiar link
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Seção 4: Responsável ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: COR_VERDE }}>
                Responsável
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Responsável</Label>
                  <Input value={form.responsavel ?? ""} onChange={e => set("responsavel", e.target.value)}
                    placeholder="Nome" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Visto</Label>
                  <Input value={form.visto ?? ""} onChange={e => set("visto", e.target.value)}
                    placeholder="Aprovação" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.data_responsavel ?? ""}
                    onChange={e => set("data_responsavel", e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSalvar} disabled={salvando}
              style={{ background: COR_VERDE }} className="text-white hover:opacity-90 min-w-24">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : (editando ? "Salvar Alterações" : "Criar Relatório")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog de exclusão ── */}
      <AlertDialog open={!!deletarId} onOpenChange={open => !open && setDeletarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório RNC/AC será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
