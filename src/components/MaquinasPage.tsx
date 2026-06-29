"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cog, Loader2, AlertCircle, RefreshCw, Plus, History, Pencil, FileText, Search, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import EmbalagemPerfilForm from "@/components/EmbalagemPerfilForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, LabelList,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks,
  getDaysInMonth, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Maquina {
  id: number | string;
  nome?: string;
  status?: string;
  [key: string]: unknown;
}

interface RegistroProducao {
  id: number;
  data: string;
  hora_inicial: string | null;
  hora_final: string | null;
  maquina: string | null;
  produto: string | null;
  linha: string | null;
  nucleo: string | null;
  padrao: string | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  espessura_mm: number | null;
  qtd_conforme: number | null;
  qtd_nao_conforme_1: number | null;
  [key: string]: unknown;
}

interface ColunaDef {
  key: string;
  label: string;
  numeric?: boolean;
  date?: boolean;
}

const c = (key: string, label: string, opts: Partial<Omit<ColunaDef,"key"|"label">> = {}): ColunaDef => ({ key, label, ...opts });

// ─── Dashboard de Produção ────────────────────────────────────────────────────

const COR_VERDE  = "hsl(var(--primary))";
const COR_BARRA  = "#16a34a";

const MESES_DASH = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface RowDash {
  maquina:      string | null;
  data:         string;
  linha:        string | null;
  padrao:       string | null;
  largura_cm:   number | null;
  qtd_conforme: number | null;
}

function pctBarD(pct: number) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 70, height: 8, background: "#bbf7d0", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: COR_BARRA, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: COR_VERDE, minWidth: 50, textAlign: "right" }}>
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

const ANOS_DASH = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

type SetorDash = "todos" | "portas" | "guarnicao";

const SETOR_DASH_LABELS: Record<SetorDash, string> = {
  todos:     "Todos",
  portas:    "Portas",
  guarnicao: "Guarnição",
};

const KW_PORTAS_DASH = [
  "embalagem de porta",
  "esquadrejadeira",
  "furação e corte",
  "montagem do kit",
  "prensa fria",
  "colagem de borda",
  "pintura de porta",
  "pintura de tampo",
  "linha de pintura",
];

const KW_GUARNICAO_DASH = [
  "coladeira de alizar",
  "moldureira de aliza",
  "moldureira de batente",
  "recobridora de perfil",
  "embalagem de perfil",
  "unesa",
  "gaidzinski",
];

function getSetorDash(maquina: string): "portas" | "guarnicao" | null {
  const lower = (maquina ?? "").toLowerCase();
  if (KW_PORTAS_DASH.some(k => lower.includes(k))) return "portas";
  if (KW_GUARNICAO_DASH.some(k => lower.includes(k))) return "guarnicao";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

const COLUNAS_MAQUINA: Record<string, ColunaDef[]> = {
  "seccionadora 1": [
    // Material Recebido
    c("data","Data",{date:true}), c("fornecedor","Fornecedor"), c("lote_fornecedor","Lote Fornecedor"),
    c("tipo_chapa","Tipo de Chapa"), c("tipo_material","Material de Entrada"),
    c("qtd_chapas","Qtd. Chapas",{numeric:true}),
    // Material Produzido
    c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"), c("qualidade","Qualidade"),
    c("produto","Produto Fabricado"),
    c("espessura_mm","Esp. Produzida (mm)",{numeric:true}), c("largura_cm","Larg. Produzida (cm)",{numeric:true}), c("comprimento_cm","Comp. Produzido (cm)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    // Sobra
    c("esp_sobra_mm","Esp. Sobra (mm)",{numeric:true}), c("larg_sobra_cm","Larg. Sobra (cm)",{numeric:true}), c("comp_sobra_cm","Comp. Sobra (cm)",{numeric:true}),
    c("qtd_sobra","Qtd. Sobra",{numeric:true}), c("produto_sobra","Produto Sobra"),
    // Complementar
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("seccionadora_aq009","SECC. (AQ009)"),
    c("recebimento_chapa_aq01","Receb. Chapa (AQ001)"), c("recebimento_materiais_aq002","Receb. Materiais (AQ002)"),
    c("observacao","Observação"),
  ],
  "seccionadora": [
    // Material Recebido
    c("data","Data",{date:true}), c("fornecedor","Fornecedor"), c("lote_fornecedor","Lote Fornecedor"),
    c("tipo_chapa","Tipo de Chapa"), c("tipo_material","Material de Entrada"),
    c("qtd_chapas","Qtd. Chapas",{numeric:true}),
    // Material Produzido 1
    c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"), c("qualidade","Qualidade"),
    c("produto","Produto Fabricado"),
    c("espessura_mm","Esp. Produzida (mm)",{numeric:true}), c("largura_cm","Larg. Produzida (cm)",{numeric:true}), c("comprimento_cm","Comp. Produzido (cm)",{numeric:true}),
    c("qtd_producao_1","Qtd. Prod. 1",{numeric:true}),
    // Material Produzido 2
    c("esp_produzido_2_mm","Esp. 2 (mm)",{numeric:true}), c("larg_produzido_2_cm","Larg. 2 (cm)",{numeric:true}), c("comp_produzido_2_cm","Comp. 2 (cm)",{numeric:true}),
    c("qtd_producao_2","Qtd. Prod. 2",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    // Sobra
    c("esp_sobra_mm","Esp. Sobra (mm)",{numeric:true}), c("larg_sobra_cm","Larg. Sobra (cm)",{numeric:true}), c("comp_sobra_cm","Comp. Sobra (cm)",{numeric:true}),
    c("qtd_sobra","Qtd. Sobra",{numeric:true}), c("produto_sobra","Produto Sobra"),
    // Complementar
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("seccionadora_aq009","SECC. (AQ009)"),
    c("recebimento_chapa_aq01","Receb. Chapa (AQ001)"), c("recebimento_materiais_aq002","Receb. Materiais (AQ002)"),
    c("observacao","Observação"),
  ],
  "multi serra perfil": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("multi_serra_perfil_aq010","M.S.P. (AQ010)"), c("produto","Produto"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("largura_cm","Larg. (cm)",{numeric:true}), c("comprimento_cm","Comp. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("dimensao_produto","Dim. Produto"), c("dimensao_sobra","Dim. Sobra"), c("qtd_sobra","Qtd. Sobra",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"),
    c("lixamento_aq041","LIXAMENTO (AQ041)"), c("seccionadora_aq009","SECC. (AQ009)"), c("prensa_fria_aq017","PRENSA FRIA (AQ017)"),
  ],
  "moldureira de batente": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("plaina_moldureira_batente_aq011","P.M.B. (AQ011)"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. Batente (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("profundidade_rasgo_regulagem","Prof. Rasgo Regulagem",{numeric:true}), c("profundidade_rasgo_borracha","Prof. Rasgo Borracha",{numeric:true}),
    c("categoria","Categoria"),
    c("espessura_rasgo_regulagem","Esp. Rasgo Regulagem",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("multi_serra_perfil_aq010","M.S.P. (AQ010)"),
  ],
  "coladeira de alizar": [
    c("data","Data",{date:true}), c("maquina","Máquina"), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("coladeira_alizar_aq0012","COL. ALIZAR (AQ012)"), c("produto","Produto"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("esp_regua_cm","Esp. Régua (cm)",{numeric:true}),
    c("esp_aba_cm","Esp. Aba (cm)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("multi_serra_aba_aq010","M.S.P. Aba (AQ010)"), c("multi_serra_regua_aq010","M.S.P. Régua (AQ010)"),
  ],
  "esquadrejadeira": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("linha","Linha"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("acabamento","Acabamento"), c("padrao","Padrão"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("desvio_esquadro_mm","Desvio Esquadro (mm)",{numeric:true}), c("paralelismo","Paralelismo"),
    c("acabamento_lateral","Acab. Lateral"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("fornecedor","Fornecedor"),
    c("esquadrejadeira_aq040","ESQUAD. (AQ040)"), c("prensa_fria_aq017","PRENSA FRIA (AQ017)"),
  ],
  "lixadeira": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("fornecedor","Fornecedor"), c("lote_fornecedor","Lote Fornecedor"),
    c("lixamento_aq041","LIXAMENTO (AQ041)"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("produto","Produto"), c("nucleo","Núcleo"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}),
    c("retilineidade","Retilineidade"), c("textura","Textura"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("tipo_defeito_3","Defeito 3"), c("tipo_defeito_4","Defeito 4"),
    c("observacao","Observação"),
    c("destopadeira_sarrafo_aq015","DESTOP. SARRAFO (AQ015)"), c("seccionadora_aq009","SECC. (AQ009)"),
  ],
  "recobridora de tampo": [
    c("data","Data",{date:true}), c("registro","Registro"), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("n_lote","N° Lote"), c("fornecedor","Fornecedor"),
    c("recobrimento_aq019","RECOB. TAMPO (AQ019)"), c("lote_fornecedor","Lote Fornecedor"),
    c("produto","Produto"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("padrao","Padrão"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. Porta/Tampo (mm)",{numeric:true}),
    c("qualidade_recobrimento","Qual. Recobrimento"), c("tempo_cura","Tempo de Cura"),
    c("temperatura_c","Temperatura (°C)",{numeric:true}), c("tipo_cola","Tipo de Cola"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("tipo_defeito_4","Defeito 4"),
    c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("local","Local"), c("maquina","Máquina"), c("setor","Setor"),
    c("seccionadora_aq009","SECC. (AQ009)"), c("recebimento_insumos_aq044","REC. INSUMOS (AQ044)"),
    c("recebimento_materiais_aq002","REC. MATERIAIS (AQ002)"), c("lixamento_aq041","LIXAMENTO (AQ041)"),
  ],
  "colagem de borda": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("colagem_borda_aq020","COL. BORDA (AQ020)"),
    c("cliente","Cliente"), c("nome_cliente","Nome Cliente"), c("linha","Linha"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("padrao","Padrão"), c("tipo_cola","Tipo de Cola"),
    c("largura_cm","Larg. (cm)",{numeric:true}), c("comprimento_cm","Comp. Porta (cm)",{numeric:true}), c("espessura_mm","Esp. Porta (mm)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("esquadrejadeira_aq040","ESQUAD. (AQ040)"),
  ],
  "linha de pintura de tampo": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("linha_pintura_aq021","L. PINTURA TAMPO (AQ021)"), c("fornecedor","Fornecedor"), c("lote_fornecedor","Lote Fornecedor"),
    c("produto","Produto"), c("padrao","Padrão"), c("qtd_demao","Qtd. Demão",{numeric:true}),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (cm)",{numeric:true}),
    c("qualidade","Qualidade"), c("gramatura_gm2","Gramatura (g/m²)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("seccionadora_aq009","SECC. (AQ009)"), c("lixamento_aq041","LIXAMENTO (AQ041)"),
  ],
  "furação e corte": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("usinagem_portas_aq023","USINAGEM PORTAS (AQ023)"), c("cliente","Cliente"), c("linha","Linha"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("acabamento","Acabamento"), c("padrao","Padrão"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("qualidade_usinagem","Qual. Usinagem"),
    c("altura_dobradica_inferior","Alt. Dobrad. Inf."), c("altura_dobradica_superior","Alt. Dobrad. Sup."),
    c("sentido_abertura_dir","Sentido Dir."), c("sentido_abertura_esq","Sentido Esq."),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"),
    c("colagem_borda_aq020","COL. BORDA (AQ020)"), c("usinagem_friso_aq022","USIN. FRISO (AQ022)"),
    c("recebimento_ferragens_aq005","REC. FERRAGENS (AQ005)"),
  ],
  "recobrimento de perfil": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("maquina","Máquina"), c("recobrimento_perfil_aq025","RECOB. PERFIL (AQ025)"),
    c("produto","Produto"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("rasgo_borracha","Rasgo Borracha"), c("qualidade","Qualidade"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_perfil","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("largura_papel_cm","Larg. Papel (cm)",{numeric:true}), c("tipo_cola","Tipo de Cola"),
    c("gramatura_gm2","Gramatura (g/m²)",{numeric:true}), c("padrao","Padrão"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("setor","Setor"), c("local","Local"),
    c("recebimento_materiais_aq002","REC. MATERIAIS (AQ002)"), c("recebimento_insumos_aq044","REC. INSUMOS (AQ044)"),
    c("multi_serra_perfil_aq010","M.S.P. (AQ010)"), c("coladeira_alizar_aq0012","COL. ALIZAR (AQ012)"),
    c("plaina_moldureira_rodape_aq043","P.M. RODAPÉ (AQ043)"), c("plaina_moldureira_batente_aq011","P.M. BATENTE (AQ011)"),
  ],
  "recobridora de perfil": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("maquina","Máquina"), c("recobrimento_perfil_aq025","RECOB. PERFIL (AQ025)"),
    c("produto","Produto"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("rasgo_borracha","Rasgo Borracha"), c("qualidade","Qualidade"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_perfil","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("largura_papel_cm","Larg. Papel (cm)",{numeric:true}), c("tipo_cola","Tipo de Cola"),
    c("gramatura_gm2","Gramatura (g/m²)",{numeric:true}), c("padrao","Padrão"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("setor","Setor"), c("local","Local"),
    c("recebimento_materiais_aq002","REC. MATERIAIS (AQ002)"), c("recebimento_insumos_aq044","REC. INSUMOS (AQ044)"),
    c("multi_serra_perfil_aq010","M.S.P. (AQ010)"), c("coladeira_alizar_aq0012","COL. ALIZAR (AQ012)"),
    c("plaina_moldureira_rodape_aq043","P.M. RODAPÉ (AQ043)"), c("plaina_moldureira_batente_aq011","P.M. BATENTE (AQ011)"),
  ],
  "montadora de grade": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("nucleo","Núcleo"),
    c("largura_cm","Larg. (cm)",{numeric:true}), c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("qtd_nao_conforme_1","Qtd. NC",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
  ],
  "montagem do kit": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("maquina","Máquina"), c("linha","Linha"),
    c("nucleo","Núcleo"), c("padrao","Padrão"), c("acabamento","Acabamento"),
    c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("largura_kit_cm","Larg. Kit (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}),
    c("altura_kit_cm","Alt. Kit (cm)",{numeric:true}), c("espessura_mm","Esp. Porta (mm)",{numeric:true}),
    c("entre_folha_rebaixo","Folha/Rebaixo",{numeric:true}),
    c("entre_folha_travessa","Folha/Travessa",{numeric:true}),
    c("entre_folha_marco","Folha/Marco",{numeric:true}),
    c("sistema_trava","Sistema de Trava"),
    c("qualidade_visual_final","Qual. Visual"), c("etiqueta_identificacao","Etiqueta"),
    c("sentido_abertura_dir","Sentido Dir."), c("sentido_abertura_esq","Sentido Esq."),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
  ],
  "prensa fria": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("fornecedor","Fornecedor"), c("linha","Linha"),
    c("prensa_fria_aq017","PRENSA FRIA (AQ017)"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("padrao","Padrão"),
    c("pressao_kgf_cm2","Pressão (kgF/cm²)",{numeric:true}),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. Porta (mm)",{numeric:true}),
    c("numero_maquina","N° Máquina"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"),
    c("seccionadora_aq009","SECC. (AQ009)"), c("linha_pintura_aq021","L. PINTURA TAMPO (AQ021)"),
    c("recobrimento_aq019","RECOBRIMENTO (AQ019)"), c("montadora_grade_aq039","MONT. GRADE (AQ039)"),
    c("mesa_montagem_aq016","MESA MONT. (AQ016)"), c("recebimento_insumos_aq044","REC. INSUMOS (AQ044)"),
  ],
  "embalagem de kit": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("cliente","Cliente"), c("nome_cliente","Nome Cliente"),
    c("largura_kit_cm","Larg. Kit (cm)",{numeric:true}),
    c("largura_batente_cm","Larg. Batente (cm)",{numeric:true}),
    c("linha","Linha"), c("nucleo","Núcleo"), c("padrao","Padrão"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("montagem_kit_aq029","MONT. KIT (AQ029)"),
  ],
  "embalagem de portas": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("cliente","Cliente"), c("nome_cliente","Nome Cliente"),
    c("linha","Linha"), c("nucleo","Núcleo"), c("padrao","Padrão"),
    c("largura_cm","Larg. (cm)",{numeric:true}), c("comprimento_cm","Comp. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"), c("embalagem_portas_aq024","EMBALAGEM PORTAS (AQ024)"), c("colagem_borda_aq020","COL. BORDA (AQ020)"),
  ],
  "embalagem de perfil": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("produto","Produto"), c("modelo_batente","Modelo do Batente"), c("unidade","Unid."),
    c("material_certificado_fsc","Mat. Certif. (FSC)"), c("padrao","Padrão"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("dim_cabeceira_alizar_cm","Dim. Cab. Alizar (cm)",{numeric:true}),
    c("largura_rebaixo_bat_mm","Larg. Rebaixo Bat. (mm)",{numeric:true}),
    c("prof_rebaixo_bat_mm","Prof. Rebaixo Bat. (mm)",{numeric:true}),
    c("qualidade_visual_final","Qual. Visual Final"),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Tipo de Defeito"), c("qtd_nao_conforme_1","Qtd. NC",{numeric:true}),
  ],
  "linha de pintura de portas": [
    c("data","Data",{date:true}), c("hora_inicial","H. Inicial"), c("hora_final","H. Final"),
    c("cliente","Cliente"), c("linha_pintura_portas_aq018","L. PINTURA PORTAS (AQ018)"),
    c("linha","Linha"), c("material_certificado_fsc","Mat. Certif. (FSC)"),
    c("nucleo","Núcleo"), c("padrao","Padrão"),
    c("comprimento_cm","Comp. (cm)",{numeric:true}), c("largura_cm","Larg. (cm)",{numeric:true}), c("espessura_mm","Esp. (mm)",{numeric:true}),
    c("qualidade","Qualidade"), c("gramatura_gm2","Gramatura (g/m²)",{numeric:true}),
    c("qtd_conforme","Qtd. Conforme",{numeric:true}),
    c("tipo_defeito_1","Defeito 1"), c("qtd_nao_conforme_1","Qtd. NC 1",{numeric:true}),
    c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
    c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
    c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
    c("observacao","Observação"),
    c("recebimento_insumos_aq044","REC. INSUMOS (AQ044)"), c("colagem_borda_aq020","COL. BORDA (AQ020)"),
    c("usinagem_portas_aq023","FURAÇÃO/CORTE (AQ023)"), c("usinagem_friso_aq022","USIN. FRISO (AQ022)"),
  ],
};

const COLUNAS_DEFAULT: ColunaDef[] = [
  c("data","Data",{date:true}), c("hora_final","H. Final"), c("produto","Produto"),
  c("linha","Linha"), c("nucleo","Núcleo"), c("padrao","Cor/Padrão"),
  c("largura_cm","Larg. (cm)",{numeric:true}), c("qtd_conforme","Qtd. Conforme",{numeric:true}),
  c("qtd_nao_conforme_1","Qtd. NC",{numeric:true}), c("tipo_defeito_1","Defeito 1"),
  c("tipo_defeito_2","Defeito 2"), c("qtd_nao_conforme_2","Qtd. NC 2",{numeric:true}),
  c("tipo_defeito_3","Defeito 3"), c("qtd_nao_conforme_3","Qtd. NC 3",{numeric:true}),
  c("tipo_defeito_4","Defeito 4"), c("qtd_nao_conforme_4","Qtd. NC 4",{numeric:true}),
];

function getColunasParaMaquina(nomeMaquina: string): ColunaDef[] {
  const chave = nomeMaquina.trim().toLowerCase();
  for (const [k, cols] of Object.entries(COLUNAS_MAQUINA)) {
    if (chave.includes(k)) return cols;
  }
  return COLUNAS_DEFAULT;
}

function fmtCelula(val: unknown, col: ColunaDef): string {
  if (val == null || val === "") return "—";
  if (col.date) { try { return format(parseISO(String(val)), "dd/MM/yyyy"); } catch { return String(val); } }
  if (col.numeric) { const n = Number(val); return isNaN(n) ? String(val) : n.toLocaleString("pt-BR"); }
  return String(val);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSemanasMes(): { label: string; inicio: string; fim: string }[] {
  const inicio = startOfMonth(new Date());
  const semanas = [];
  for (let i = 0; i < 5; i++) {
    const seg = startOfWeek(addWeeks(inicio, i), { weekStartsOn: 1 });
    const sex = endOfWeek(seg, { weekStartsOn: 1 });
    const fimMes = endOfMonth(new Date());
    if (seg > fimMes) break;
    semanas.push({
      label: `Sem ${i + 1}`,
      inicio: format(seg < inicio ? inicio : seg, "yyyy-MM-dd"),
      fim: format(sex > fimMes ? fimMes : sex, "yyyy-MM-dd"),
    });
  }
  return semanas;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Histórico de Produção ────────────────────────────────────────────────────

function HistoricoSheet({ maquina, open, onClose, canEdit }: {
  maquina: Maquina | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const hoje = new Date();
  const [anoFiltro, setAnoFiltro] = useState<string>(String(hoje.getFullYear()));
  const histReqRef = useRef(0);
  const [todosMD, setTodosMD] = useState<boolean>(true);
  const [selecaoMD, setSelecaoMD] = useState<Set<string>>(new Set());
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set());
  const [todosRegistros, setTodosRegistros] = useState<RegistroProducao[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [editReg, setEditReg] = useState<RegistroProducao | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Filtragem client-side por mês/dia
  const registros = todosMD
    ? todosRegistros
    : todosRegistros.filter(r => {
        const mm = r.data.slice(5, 7);
        const dd = r.data.slice(8, 10);
        return selecaoMD.has(mm) || selecaoMD.has(`${mm}-${dd}`);
      });

  const buscarHistorico = useCallback(async () => {
    if (!maquina?.nome) return;
    histReqRef.current += 1;
    const myReq = histReqRef.current;
    setLoadingHist(true);

    const nomeMaquina = (maquina.nome as string).trim();
    const TAM = 1000;
    let pagina = 0;
    const todos: RegistroProducao[] = [];

    while (true) {
      let query = supabase
        .from("registros_producao")
        .select("*")
        .eq("maquina", nomeMaquina)
        .order("data", { ascending: false })
        .order("hora_inicial", { ascending: true, nullsFirst: false })
        .range(pagina * TAM, (pagina + 1) * TAM - 1);

      if (anoFiltro !== "todos") {
        query = query.gte("data", `${anoFiltro}-01-01`).lte("data", `${anoFiltro}-12-31`);
      }

      const { data, error } = await query;
      if (myReq !== histReqRef.current) return;
      if (error) {
        toast.error("Erro ao buscar histórico: " + error.message);
        break;
      }
      if (!data || data.length === 0) break;
      todos.push(...data);
      if (data.length < TAM) break;
      pagina++;
    }

    if (myReq !== histReqRef.current) return;
    setTodosRegistros(todos);
    setLoadingHist(false);
  }, [maquina, anoFiltro]);

  useEffect(() => {
    if (open && maquina) buscarHistorico();
  }, [open, maquina, buscarHistorico]);

  // Dados para o gráfico — agrupa por dia se apenas 1 mês, por ano-mês se "todos", por mês caso contrário
  const dadosGrafico = (() => {
    const MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

    const anosComDados = new Set(registros.map(r => r.data.slice(0, 4)));
    const mesesComDados = new Set(registros.map(r => r.data.slice(5, 7)));

    // Um único mês → mostra por dia
    if (anosComDados.size <= 1 && mesesComDados.size <= 1 && registros.length > 0) {
      const mm = [...mesesComDados][0];
      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
      const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
      const mapa: Record<string, number> = {};
      for (let d = 1; d <= diasNo; d++) mapa[String(d).padStart(2, "0")] = 0;
      for (const r of registros) {
        const d = r.data.slice(8, 10);
        mapa[d] = (mapa[d] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([label, producao]) => ({ label, producao }));
    }

    // "Todos" ou múltiplos anos → agrupa por ano-mês ordenado cronologicamente
    if (anoFiltro === "todos" || anosComDados.size > 1) {
      const mapa: Record<string, number> = {};
      for (const r of registros) {
        const ym = r.data.slice(0, 7); // "2024-01"
        mapa[ym] = (mapa[ym] ?? 0) + (Number(r.qtd_conforme) || 0);
      }
      return Object.entries(mapa)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, producao]) => {
          const [ano, mm] = ym.split("-");
          return { label: `${MESES_PT[Number(mm) - 1]}/${ano.slice(2)}`, producao };
        });
    }

    // Ano específico → agrupa por mês, ordenado numericamente
    const mapa: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) mapa[String(m).padStart(2, "0")] = 0;
    for (const r of registros) {
      const m = r.data.slice(5, 7);
      mapa[m] = (mapa[m] ?? 0) + (Number(r.qtd_conforme) || 0);
    }
    // Limite: ano atual → até o mês corrente; ano passado → até o último mês com dados
    const ultimoComDados = Object.entries(mapa)
      .filter(([, v]) => v > 0).map(([m]) => Number(m))
      .reduce((max, m) => Math.max(max, m), 0);
    const limite = anoFiltro === String(hoje.getFullYear())
      ? Math.max(hoje.getMonth() + 1, ultimoComDados)
      : ultimoComDados || 12;
    return Object.entries(mapa)
      .sort(([a], [b]) => Number(a) - Number(b))
      .filter(([m]) => Number(m) <= limite)
      .map(([m, producao]) => ({
        label: MESES[Number(m) - 1].slice(0, 3),
        producao,
      }));
  })();

  const total = registros.reduce((s, r) => s + (Number(r.qtd_conforme) || 0), 0);

  const anos = Array.from({ length: 5 }, (_, i) => String(hoje.getFullYear() - i));

  const labelMesDia = todosMD ? "Todos" : selecaoMD.size === 0 ? "Nenhum" : `${selecaoMD.size} selecionado(s)`;

  function toggleTodos() {
    setTodosMD(p => !p);
    setSelecaoMD(new Set());
  }

  function toggleMes(mm: string) {
    setTodosMD(false);
    setSelecaoMD(prev => {
      const next = new Set(prev);
      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
      const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
      if (next.has(mm)) {
        next.delete(mm);
        for (let d = 1; d <= diasNo; d++) next.delete(`${mm}-${String(d).padStart(2, "0")}`);
      } else {
        next.add(mm);
        for (let d = 1; d <= diasNo; d++) next.delete(`${mm}-${String(d).padStart(2, "0")}`);
      }
      return next;
    });
  }

  function toggleDia(mm: string, dd: string) {
    setTodosMD(false);
    setSelecaoMD(prev => {
      const next = new Set(prev);
      const key = `${mm}-${dd}`;
      if (next.has(mm)) {
        next.delete(mm);
        const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
        const diasNo = getDaysInMonth(new Date(anoNum, Number(mm) - 1, 1));
        for (let d = 1; d <= diasNo; d++) {
          const dk = `${mm}-${String(d).padStart(2, "0")}`;
          if (dk !== key) next.add(dk);
        }
      } else if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleExpandir(mm: string) {
    setMesesExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(mm)) next.delete(mm); else next.add(mm);
      return next;
    });
  }

  function gerarPDF() {
    const doc = new jsPDF();
    const nomeMaquina = (maquina?.nome as string) ?? "Máquina";

    const periodoLabel = todosMD
      ? (anoFiltro === "todos" ? "Todos os períodos" : anoFiltro)
      : anoFiltro;

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Produção", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Máquina: ${nomeMaquina}`, 14, 30);
    doc.text(`Período: ${periodoLabel}`, 14, 37);
    doc.text(`Total de registros: ${registros.length}`, 14, 44);
    doc.text(`Total produzido: ${total.toLocaleString("pt-BR")} pç`, 14, 51);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 58);

    // Tabela de resumo (gráfico agrupado)
    const temDadosGrafico = dadosGrafico.some((d) => d.producao > 0);
    let yPos = 68;

    if (temDadosGrafico) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por período", 14, yPos);

      autoTable(doc, {
        startY: yPos + 4,
        head: [["Período", "Produção (pç)"]],
        body: dadosGrafico.map((d) => [
          d.label,
          d.producao.toLocaleString("pt-BR"),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 1: { halign: "right" } },
      });

      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // Tabela de registros detalhados
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Registros detalhados", 14, yPos);

    const colunasPDF = getColunasParaMaquina(nomeMaquina);
    autoTable(doc, {
      startY: yPos + 4,
      head: [colunasPDF.map((col) => col.label)],
      body: registros.map((r) => colunasPDF.map((col) => fmtCelula((r as Record<string,unknown>)[col.key], col))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const nomeArquivo = `relatorio-${norm(nomeMaquina).replace(/\s+/g, "-")}-${periodoLabel.replace(/[\s/]+/g, "-")}.pdf`;
    doc.save(nomeArquivo);
  }

  function gerarExcel() {
    const nomeMaquina = (maquina?.nome as string) ?? "Máquina";
    const periodoLabel = todosMD
      ? (anoFiltro === "todos" ? "todos" : anoFiltro)
      : anoFiltro;

    const colunasXLS = getColunasParaMaquina(nomeMaquina);
    const cabecalho = colunasXLS.map((col) => col.label);
    const linhas = registros.map((r) =>
      colunasXLS.map((col) => {
        const val = (r as Record<string,unknown>)[col.key];
        if (val == null || val === "") return "";
        if (col.date) { try { return format(parseISO(String(val)), "dd/MM/yyyy"); } catch { return String(val); } }
        if (col.numeric) { const n = Number(val); return isNaN(n) ? String(val) : n; }
        return String(val);
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomeMaquina.slice(0, 31));

    const nomeArquivo = `relatorio-${norm(nomeMaquina).replace(/\s+/g, "-")}-${periodoLabel}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  function openEdit(r: RegistroProducao) {
    setEditReg(r);
    setEditForm({ ...r });
  }

  async function salvarEdicao() {
    if (!editReg) return;
    setSavingEdit(true);
    const colunas = getColunasParaMaquina(maquina?.nome ?? "");
    const payload: Record<string, unknown> = {};
    for (const col of colunas) {
      const raw = editForm[col.key];
      if (col.numeric) {
        payload[col.key] = raw === "" || raw === undefined || raw === null ? null : Number(raw);
      } else {
        payload[col.key] = raw === "" ? null : (raw ?? null);
      }
    }
    const { error } = await supabase.from("registros_producao").update(payload).eq("id", editReg.id);
    setSavingEdit(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Registro atualizado.");
    setEditReg(null);
    buscarHistorico();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col gap-0 p-0 overflow-hidden mt-[72px]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Produção — {(maquina?.nome as string) ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0 overflow-y-auto px-6 py-4 space-y-4 max-h-[280px]">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Ano */}
            <div className="grid gap-1">
              <Label className="text-xs">Ano</Label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-8 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mês, Dia — tree select */}
            <div className="grid gap-1">
              <Label className="text-xs">Mês, Dia</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 text-xs w-44 border border-input rounded-md px-2 flex items-center justify-between bg-background hover:bg-accent transition-colors"
                  >
                    <span className="truncate">{labelMesDia}</span>
                    <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-52" align="start">
                  <div className="max-h-72 overflow-y-auto text-xs">
                    {/* Selecionar tudo */}
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                      <input type="checkbox" checked={todosMD} onChange={toggleTodos} className="h-3.5 w-3.5 accent-primary" />
                      <span>Selecionar tudo</span>
                    </label>
                    <div className="border-t my-0.5" />
                    {/* Meses */}
                    {MESES.map((nomeMes, i) => {
                      const mm = String(i + 1).padStart(2, "0");
                      const anoNum = anoFiltro === "todos" ? hoje.getFullYear() : Number(anoFiltro);
                      const diasNo = getDaysInMonth(new Date(anoNum, i, 1));
                      const checkedMes = todosMD || selecaoMD.has(mm);
                      const indetermMes = !todosMD && !selecaoMD.has(mm) &&
                        Array.from({ length: diasNo }, (_, d) => String(d + 1).padStart(2, "0"))
                          .some(d => selecaoMD.has(`${mm}-${d}`));
                      const expandido = mesesExpandidos.has(mm);
                      return (
                        <div key={mm}>
                          <div className="flex items-center gap-1 px-2 py-1 hover:bg-accent">
                            <button
                              type="button"
                              onClick={() => toggleExpandir(mm)}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {expandido
                                ? <ChevronDown className="h-3 w-3" />
                                : <ChevronRight className="h-3 w-3" />}
                            </button>
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={checkedMes}
                                ref={el => { if (el) el.indeterminate = indetermMes; }}
                                onChange={() => toggleMes(mm)}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              {nomeMes.toLowerCase()}
                            </label>
                          </div>
                          {expandido && (
                            <div className="pl-8">
                              {Array.from({ length: diasNo }, (_, d) => {
                                const dd = String(d + 1).padStart(2, "0");
                                const checkedDia = todosMD || selecaoMD.has(mm) || selecaoMD.has(`${mm}-${dd}`);
                                return (
                                  <label key={dd} className="flex items-center gap-2 px-3 py-0.5 hover:bg-accent cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checkedDia}
                                      onChange={() => toggleDia(mm, dd)}
                                      className="h-3.5 w-3.5 accent-primary"
                                    />
                                    {d + 1}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button size="sm" onClick={buscarHistorico} disabled={loadingHist} className="h-8 gap-1.5">
              {loadingHist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Buscar
            </Button>

            {registros.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={gerarPDF} className="h-8 gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={gerarExcel} className="h-8 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </>
            )}
          </div>

          {/* Resumo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{registros.length} registro(s)</span>
            <span className="font-semibold">{total.toLocaleString("pt-BR")} pç no total</span>
          </div>

          {/* Gráfico */}
          {dadosGrafico.some((d) => d.producao > 0) && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosGrafico} barSize={dadosGrafico.length <= 12 ? 20 : 10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                  formatter={(v: number) => [v.toLocaleString("pt-BR") + " pç", "Produção"]}
                />
                <Bar dataKey="producao" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

        {/* Tabela — container com posição absoluta garante que as barras de rolagem
            apareçam dentro dos limites visíveis do dialog */}
        <div className="flex-1 min-h-0 relative border-t">
          <div className="absolute inset-0 overflow-auto">
            {loadingHist ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : registros.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum registro encontrado para o período.
              </div>
            ) : (() => {
                const colunas = getColunasParaMaquina(maquina?.nome ?? "");
                return (
                  <table className="w-max text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {colunas.map((col) => (
                          <th key={col.key} className={`px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap${col.numeric ? " text-right" : " text-left"}`}>
                            {col.label}
                          </th>
                        ))}
                        {canEdit && <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map((r, i) => (
                        <tr key={r.id} className={`border-b hover:bg-muted/30 transition-colors${i % 2 === 0 ? "" : " bg-muted/10"}`}>
                          {colunas.map((col) => (
                            <td key={col.key} className={`px-3 py-2 text-xs whitespace-nowrap${col.numeric ? " text-right tabular-nums" : ""}`}>
                              {fmtCelula((r as Record<string,unknown>)[col.key], col)}
                            </td>
                          ))}
                          {canEdit && (
                            <td className="px-3 py-2 text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog de edição de registro */}
    <Dialog open={!!editReg} onOpenChange={(v) => { if (!v) setEditReg(null); }}>
      <DialogContent className="sm:max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Editar Registro</DialogTitle>
        </DialogHeader>
        {editReg && (() => {
          const colunasEdit = getColunasParaMaquina(maquina?.nome ?? "");
          return (
            <div className="max-h-[60vh] overflow-y-auto py-2 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {colunasEdit.map((col) => {
                  const inputType = col.date
                    ? "date"
                    : (col.key === "hora_inicial" || col.key === "hora_final")
                      ? "time"
                      : col.numeric
                        ? "number"
                        : "text";
                  return (
                    <div key={col.key} className="space-y-1.5">
                      <Label className="text-xs">{col.label}</Label>
                      <Input
                        type={inputType}
                        value={String(editForm[col.key] ?? "")}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [col.key]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={salvarEdicao} disabled={savingEdit}>
            {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Card de Máquina ──────────────────────────────────────────────────────────

function MaquinaCard({
  maquina,
  producaoPorSemana,
  totalMes,
  onClick,
  onEdit,
  onLancar,
  canEdit,
}: {
  maquina: Maquina;
  producaoPorSemana: { label: string; producao: number }[];
  totalMes: number;
  onClick: () => void;
  onEdit: (m: Maquina) => void;
  onLancar?: (() => void) | null;
  canEdit: boolean;
}) {
  const nome = (maquina.nome as string) || `Máquina ${maquina.id}`;
  const isEmbPerfil = nome.trim().toUpperCase() === "EMBALAGEM DE PERFIL";
  const status = (maquina.status as string) || null;
  const isAtiva =
    !status ||
    status.toLowerCase() === "ativa" ||
    status.toLowerCase() === "ativo" ||
    status.toLowerCase() === "active";

  return (
    <Card
      className={`flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 ${
        isAtiva ? "border-l-primary" : "border-l-muted-foreground/30"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAtiva ? "bg-primary/10" : "bg-muted"
            }`}>
              <Cog className={`h-5 w-5 ${isAtiva ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold leading-tight truncate">{nome}</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  isAtiva ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                }`} />
                <span className="text-xs text-muted-foreground">
                  {status ?? "Ativa"}
                </span>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(maquina); }}
              title="Editar nome"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1 pt-1">
        {/* Produção do mês em destaque */}
        <div className={`rounded-lg px-3 py-2 ${isAtiva ? "bg-primary/5" : "bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground mb-0.5">
            {format(new Date(), "MMMM yyyy", { locale: ptBR })}
          </p>
          <p className={`text-2xl font-bold leading-tight ${isAtiva ? "text-primary" : "text-muted-foreground"}`}>
            {totalMes.toLocaleString("pt-BR")}
            <span className="text-sm font-normal ml-1 text-muted-foreground">pç</span>
          </p>
        </div>

        {/* Mini gráfico */}
        {totalMes > 0 ? (
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={producaoPorSemana} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                formatter={(v: number) => [v.toLocaleString("pt-BR") + " pç", "Produção"]}
              />
              <Bar dataKey="producao" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[72px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Sem registros no mês
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto pt-1">
          {isEmbPerfil && (
            <Button
              size="sm"
              variant="default"
              className="w-full text-xs"
              onClick={(e) => { e.stopPropagation(); onLancar?.(); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Lançar Produção
            </Button>
          )}
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
            <History className="h-3 w-3" />
            Ver histórico completo
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

const EMPTY_MAQUINA = { nome: "" };

export default function MaquinasPage({ user }: { user: { perfil?: string } }) {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [producao, setProducao] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ nome: string }>(EMPTY_MAQUINA);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<Maquina | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | null>(null);
  const [editNome, setEditNome] = useState("");
  const [lancamentoOpen, setLancamentoOpen] = useState(false);
  const [busca, setBusca] = useState("");

  // ── Dashboard states ──
  const [anoD,       setAnoD]       = useState(String(new Date().getFullYear()));
  const [mesD,       setMesD]       = useState(String(new Date().getMonth() + 1));
  const [diasSel,    setDiasSel]    = useState<Set<number>>(new Set());   // vazio = todos
  const [setorD,     setSetorD]     = useState<SetorDash>("todos");
  const [maqsSel,    setMaqsSel]    = useState<Set<string>>(new Set()); // vazio = todas
  const [dashRows,   setDashRows]   = useState<RowDash[]>([]);
  const [loadingD,   setLoadingD]   = useState(false);
  const [dashErro,   setDashErro]   = useState<string | null>(null);
  // drill-down selections
  const [selMaq,     setSelMaq]     = useState<string | null>(null);
  const [selLinha,        setSelLinha]        = useState<string | null>(null);
  const [selPadrao,       setSelPadrao]       = useState<string | null>(null);
  const [showAllPadrao,   setShowAllPadrao]   = useState(false);
  const [showAllLargura,  setShowAllLargura]  = useState(false);
  const [showAllMaq,      setShowAllMaq]      = useState(false);

  const canEdit = ["administrador", "supervisor"].includes((user.perfil ?? "").toLowerCase());

  const clearDrill = () => { setSelMaq(null); setSelLinha(null); setSelPadrao(null); };
  const handleSetorD = (s: SetorDash) => { setSetorD(s); setMaqsSel(new Set()); clearDrill(); };
  const handleAnoD   = (v: string)    => { setAnoD(v);   setDiasSel(new Set()); clearDrill(); };
  const handleMesD   = (v: string)    => { setMesD(v);   setDiasSel(new Set()); clearDrill(); };

  // Seleções independentes — cada uma filtra as demais dimensões
  const clickMaq    = (orig: string) => setSelMaq(p    => p    === orig ? null : orig);
  const clickLinha  = (l: string)    => setSelLinha(p  => p    === l    ? null : l);
  const clickPadrao = (pad: string)  => setSelPadrao(p => p    === pad  ? null : pad);

  const semanas = getSemanasMes();
  const dashReqRef = useRef(0);

  const buscarDash = useCallback(async () => {
    dashReqRef.current += 1;
    const myReq = dashReqRef.current;
    setLoadingD(true);
    setDashErro(null);
    const mm = String(Number(mesD)).padStart(2, "0");
    const inicio = mesD === "0" ? `${anoD}-01-01` : `${anoD}-${mm}-01`;
    const fim    = mesD === "0" ? `${anoD}-12-31`
      : format(endOfMonth(new Date(Number(anoD), Number(mesD) - 1, 1)), "yyyy-MM-dd");
    const TAM = 1000;
    let pagina = 0;
    const todas: RowDash[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina,data,linha,padrao,largura_cm,qtd_conforme")
        .gte("data", inicio)
        .lte("data", fim)
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (myReq !== dashReqRef.current) return;
      if (error) {
        setDashErro(`Erro Supabase: ${error.message} (código: ${error.code})`);
        break;
      }
      if (!data || data.length === 0) break;
      todas.push(...(data as RowDash[]));
      if (data.length < TAM) break;
      pagina++;
    }
    if (myReq !== dashReqRef.current) return;
    setDashRows(todas);
    setLoadingD(false);
  }, [anoD, mesD]);

  useEffect(() => { void buscarDash(); }, [buscarDash]);

  const fetchDados = useCallback(async (setSpin: (v: boolean) => void) => {
    setSpin(true);
    setErro(null);

    const dataInicio = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const dataFim    = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const { data: maquinasData, error: err1 } = await supabase.from("maquinas").select("*").order("nome");
    if (err1) { setErro(err1.message); setSpin(false); return; }
    setMaquinas(maquinasData ?? []);

    type Registro = { maquina: string | null; data: string | null; qtd_conforme: number | null };
    const registros: Registro[] = [];
    const TAM_PAG = 1000;
    let pagina = 0;
    while (true) {
      const { data: lote, error: err2 } = await supabase
        .from("registros_producao")
        .select("maquina, data, qtd_conforme")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .range(pagina * TAM_PAG, (pagina + 1) * TAM_PAG - 1);
      if (err2) { setErro(err2.message); setSpin(false); return; }
      if (!lote || lote.length === 0) break;
      registros.push(...lote);
      if (lote.length < TAM_PAG) break;
      pagina++;
    }

    const mapa: Record<string, Record<string, number>> = {};
    for (const r of registros ?? []) {
      if (!r.maquina || !r.data) continue;
      const chave = norm(r.maquina);
      const qtd = Number(r.qtd_conforme) || 0;
      const semana = semanas.find((s) => r.data >= s.inicio && r.data <= s.fim);
      if (!semana) continue;
      if (!mapa[chave]) mapa[chave] = {};
      mapa[chave][semana.label] = (mapa[chave][semana.label] ?? 0) + qtd;
    }

    setProducao(mapa);
    setSpin(false);
  }, []);

  useEffect(() => { fetchDados(setLoading); }, [fetchDados]);

  function abrirEdicao(m: Maquina) {
    setEditMaquina(m);
    setEditNome((m.nome as string) ?? "");
    setEditDialogOpen(true);
  }

  async function salvarEdicao() {
    if (!editNome.trim()) {
      toast.error("Informe o nome da máquina.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("maquinas")
      .update({ nome: editNome.trim() })
      .eq("id", editMaquina!.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Nome atualizado com sucesso.");
    setEditDialogOpen(false);
    setEditMaquina(null);
    fetchDados(setSyncing);
  }

  async function salvarMaquina() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da máquina.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("maquinas").insert({ nome: form.nome.trim() });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Máquina adicionada com sucesso.");
    setDialogOpen(false);
    setForm(EMPTY_MAQUINA);
    fetchDados(setSyncing);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerCustom />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>Erro ao carregar: {erro}</span>
      </div>
    );
  }

  if (maquinas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma máquina encontrada.
      </div>
    );
  }

  const totalGeralMes = Object.values(producao).reduce((acc, mapa) => {
    return acc + Object.values(mapa).reduce((s, v) => s + v, 0);
  }, 0);
  const totalAtivas = maquinas.filter((m) => {
    const s = (m.status as string)?.toLowerCase();
    return !s || s === "ativa" || s === "ativo" || s === "active";
  }).length;

  // ── Cálculos do Dashboard — filtro facetado ──
  const dashPorSetor = setorD === "todos"
    ? dashRows
    : dashRows.filter(r => getSetorDash(r.maquina ?? "") === setorD);

  const dashComDia = diasSel.size === 0
    ? dashPorSetor
    : dashPorSetor.filter(r => diasSel.has(Number(r.data.slice(8, 10))));

  const dashFiltrados = maqsSel.size === 0
    ? dashComDia
    : dashComDia.filter(r => maqsSel.has(r.maquina ?? ""));

  // Helpers de filtro por dimensão
  const byMaq    = (r: RowDash) => !selMaq    || (r.maquina ?? "")    === selMaq;
  const byLinha  = (r: RowDash) => !selLinha  || (r.linha   || "—")   === selLinha;
  const byPadrao = (r: RowDash) => !selPadrao || (r.padrao  || "—")   === selPadrao;

  // KPIs — aplica todos os filtros de clique (máquina, linha, padrão)
  const ctxKpi = dashFiltrados.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const totalDash = ctxKpi.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const diasComProducao = new Set(ctxKpi.filter(r => (r.qtd_conforme ?? 0) > 0).map(r => r.data)).size;
  const mediaDiaria = diasComProducao > 0 ? Math.round(totalDash / diasComProducao) : 0;

  // Gráfico de máquinas: vê todas as máquinas, filtrado por linha + padrão
  // (a própria dimensão máquina NÃO filtra seu próprio gráfico — selMaq só destaca)
  const ctxMaqChart = dashFiltrados.filter(r => byLinha(r) && byPadrao(r));
  const dashMaqMap: Record<string, number> = {};
  for (const r of ctxMaqChart) {
    const m = r.maquina ?? "—";
    dashMaqMap[m] = (dashMaqMap[m] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorMaquinaAll = Object.entries(dashMaqMap)
    .map(([orig, total]) => ({ maquina: orig.toUpperCase(), orig, total }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const dashPorMaquina = showAllMaq ? dashPorMaquinaAll : dashPorMaquinaAll.slice(0, 10);

  // Gráfico mensal: todas as dimensões aplicadas
  const ctxDaily = dashFiltrados.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const _MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const dashMesMap: Record<string, number> = {};
  if (mesD === "0") {
    for (let m = 1; m <= 12; m++) {
      dashMesMap[`${anoD}-${String(m).padStart(2, "0")}`] = 0;
    }
  }
  for (const r of ctxDaily) {
    const mes = r.data.slice(0, 7); // "2026-05"
    dashMesMap[mes] = (dashMesMap[mes] ?? 0) + (r.qtd_conforme ?? 0);
  }
  // Limite: ano atual → até o mês corrente; ano passado → até o último mês com dados
  const _agora = new Date();
  const anoAtualStr = String(_agora.getFullYear());
  const mesAtualKey = `${anoD}-${String(_agora.getMonth() + 1).padStart(2, "0")}`;
  const ultimoDashKey = Object.entries(dashMesMap)
    .filter(([, v]) => v > 0).map(([k]) => k).sort().pop() ?? "";
  const limiteDashKey = anoD === anoAtualStr
    ? (ultimoDashKey > mesAtualKey ? ultimoDashKey : mesAtualKey)
    : (ultimoDashKey || `${anoD}-12`);
  const dashPorDia = Object.entries(dashMesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([key]) => key <= limiteDashKey)
    .map(([mes, total]) => {
      const [ano, mm] = mes.split("-");
      return { label: `${_MESES_PT[Number(mm) - 1]}/${ano.slice(2)}`, mesKey: mes, total };
    });

  // Tabela Linha: filtrada por máquina + padrão (não pela própria linha)
  const ctxLinha = dashFiltrados.filter(r => byMaq(r) && byPadrao(r));
  const total1 = ctxLinha.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashLinhaMap: Record<string, number> = {};
  for (const r of ctxLinha) {
    const l = r.linha || "—";
    dashLinhaMap[l] = (dashLinhaMap[l] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorLinha = Object.entries(dashLinhaMap)
    .map(([linha, total]) => ({ linha, total, pct: total1 > 0 ? (total / total1) * 100 : 0 }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // Tabela Padrão: filtrada por máquina + linha (não pelo próprio padrão)
  const ctxPadrao = dashFiltrados.filter(r => byMaq(r) && byLinha(r));
  const total2 = ctxPadrao.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashPadraoMap: Record<string, number> = {};
  for (const r of ctxPadrao) {
    const p = r.padrao || "—";
    dashPadraoMap[p] = (dashPadraoMap[p] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorPadrao = Object.entries(dashPadraoMap)
    .map(([padrao, total]) => ({ padrao, total, pct: total2 > 0 ? (total / total2) * 100 : 0 }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // Tabela Largura: todas as dimensões
  const ctxLargura = dashFiltrados.filter(r => byMaq(r) && byLinha(r) && byPadrao(r));
  const total3 = ctxLargura.reduce((s, r) => s + (r.qtd_conforme ?? 0), 0);
  const dashLargMap: Record<string, number> = {};
  for (const r of ctxLargura) {
    const l = r.largura_cm != null ? String(r.largura_cm) : "—";
    dashLargMap[l] = (dashLargMap[l] ?? 0) + (r.qtd_conforme ?? 0);
  }
  const dashPorLargura = Object.entries(dashLargMap)
    .map(([largura, total]) => ({ largura, total, pct: total3 > 0 ? (total / total3) * 100 : 0 }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  // máquinas disponíveis para filtro do dashboard
  const maqsDash = Array.from(new Set(dashPorSetor.map(r => r.maquina ?? ""))).filter(Boolean).sort();

  const temSelecao = !!(selMaq || selLinha || selPadrao);

  return (
    <div className="w-full space-y-5">

      {/* ══ DASHBOARD DE PRODUÇÃO ══ */}
      <div className="space-y-4">
        {/* Toggle de Setor */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
          {(["todos", "portas", "guarnicao"] as SetorDash[]).map(s => (
            <button
              key={s}
              onClick={() => handleSetorD(s)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={
                setorD === s
                  ? { background: COR_VERDE, color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }
                  : { background: "transparent", color: "#6b7280" }
              }
            >
              {SETOR_DASH_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Filtros + KPIs */}
        <div className="flex flex-wrap items-end gap-4">
          {/* KPIs */}
          <Card className="border-green-200 bg-green-50 shrink-0">
            <CardContent className="p-4">
              <p className="text-xs text-green-700 font-medium">Qtd. Conforme</p>
              <p className="text-3xl font-bold text-green-800 leading-none mt-1">
                {loadingD ? "…" : totalDash.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 shrink-0">
            <CardContent className="p-4">
              <p className="text-xs text-green-700 font-medium">Média de Produção Diária</p>
              <p className="text-3xl font-bold text-green-800 leading-none mt-1">
                {loadingD ? "…" : mediaDiaria.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end ml-auto">
            <div className="space-y-1">
              <Label className="text-xs">Ano</Label>
              <Select value={anoD} onValueChange={handleAnoD}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANOS_DASH.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Select value={mesD} onValueChange={handleMesD}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  {MESES_DASH.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mesD !== "0" && <div className="space-y-1">
              <Label className="text-xs">Dia</Label>
              {(() => {
                const totalDias = getDaysInMonth(new Date(Number(anoD), Number(mesD) - 1, 1));
                const nomeMes = MESES_DASH[Number(mesD) - 1].toLowerCase();
                const todosSel = diasSel.size === 0;
                const labelBtn = todosSel ? "Todos" : `${diasSel.size} dia${diasSel.size > 1 ? "s" : ""}`;

                const toggleTodos = () => { setDiasSel(new Set()); clearDrill(); };
                const toggleDia = (d: number) => {
                  setDiasSel(prev => {
                    const next = new Set(prev);
                    if (next.has(d)) next.delete(d); else next.add(d);
                    return next;
                  });
                  clearDrill();
                };

                return (
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
                );
              })()}
            </div>}
            <div className="space-y-1">
              <Label className="text-xs">Máquina</Label>
              {(() => {
                const todasExpl = maqsSel.size === maqsDash.length && maqsDash.length > 0;
                const nenhuma   = maqsSel.size === 0;
                const labelBtn  = nenhuma ? "Todas" : `${maqsSel.size} máq.`;
                const toggleTodas = () => {
                  if (todasExpl || !nenhuma) { setMaqsSel(new Set()); }
                  else { setMaqsSel(new Set(maqsDash)); }
                  clearDrill();
                };
                const toggleMaq = (m: string) => {
                  setMaqsSel(prev => {
                    const next = new Set(prev);
                    if (next.has(m)) next.delete(m); else next.add(m);
                    return next;
                  });
                  clearDrill();
                };
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 text-xs w-52 border border-input rounded-md px-2 flex items-center justify-between bg-background hover:bg-accent transition-colors"
                      >
                        <span className="truncate">{labelBtn}</span>
                        <ChevronDown className="h-3 w-3 ml-1 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64" align="start">
                      <div className="max-h-72 overflow-y-auto text-xs">
                        <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer">
                          <input type="checkbox" checked={todasExpl} onChange={toggleTodas} className="h-3.5 w-3.5 accent-primary" />
                          <span>Selecionar todas</span>
                        </label>
                        <div className="border-t my-0.5" />
                        {maqsDash.map(m => (
                          <label key={m} className="flex items-center gap-2 px-3 py-1 hover:bg-accent cursor-pointer">
                            <input
                              type="checkbox"
                              checked={maqsSel.has(m)}
                              onChange={() => toggleMaq(m)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="leading-tight">{m}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => buscarDash()}
              disabled={loadingD}
              className="h-8 gap-1.5 self-end"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingD ? "animate-spin" : ""}`} />
              {loadingD ? "Carregando..." : "Sincronizar"}
            </Button>
          </div>
        </div>

        {dashErro && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-mono">
            {dashErro}
          </div>
        )}

        {loadingD ? (
          <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
        ) : (
          <>
            {/* Breadcrumb de seleção ativa */}
            {temSelecao && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-muted-foreground">Filtro ativo:</span>
                {selMaq && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-white" style={{ background: COR_VERDE }}>
                    {selMaq.toUpperCase()}
                    <button onClick={() => { setSelMaq(null); setSelLinha(null); setSelPadrao(null); }} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                  </span>
                )}
                {selLinha && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-white" style={{ background: "#166534" }}>
                    Linha: {selLinha}
                    <button onClick={() => { setSelLinha(null); setSelPadrao(null); }} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                  </span>
                )}
                {selPadrao && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-white" style={{ background: "#14532d" }}>
                    Padrão: {selPadrao}
                    <button onClick={() => setSelPadrao(null)} className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                  </span>
                )}
                <button onClick={clearDrill} className="text-muted-foreground underline hover:text-foreground">
                  Limpar tudo
                </button>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Produção por Máquina — clicável */}
              {(() => {
                const chartConfig: ChartConfig = {
                  total: { label: "Conforme", color: COR_VERDE },
                  label: { color: "#ffffff" },
                };
                return (
                  <Card className={selMaq ? "ring-2 ring-green-400" : ""}>
                    <CardContent className="pt-4 px-3 pb-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                        Produção de Portas
                        <span className="ml-2 font-normal opacity-60">(clique para filtrar)</span>
                      </p>
                      {dashPorMaquina.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                      ) : (
                        <>
                          <ChartContainer
                            config={chartConfig}
                            className="w-full [&_.recharts-wrapper]:!aspect-auto"
                            style={{ height: Math.max(160, dashPorMaquina.length * 44) }}
                          >
                            <BarChart
                              layout="vertical"
                              data={dashPorMaquina}
                              margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
                              barSize={22}
                            >
                              <YAxis
                                dataKey="maquina"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                hide
                              />
                              <XAxis dataKey="total" type="number" hide />
                              <ChartTooltip
                                cursor={false}
                                content={
                                  <ChartTooltipContent
                                    indicator="line"
                                    formatter={(value) => [
                                      (value as number).toLocaleString("pt-BR"),
                                      "Conforme",
                                    ]}
                                  />
                                }
                              />
                              <Bar
                                dataKey="total"
                                radius={4}
                                style={{ cursor: "pointer" }}
                                onClick={(d: { orig: string }) => clickMaq(d.orig)}
                              >
                                {dashPorMaquina.map((item) => (
                                  <Cell
                                    key={item.orig}
                                    fill={!selMaq || selMaq === item.orig ? COR_VERDE : "#bbf7d0"}
                                  />
                                ))}
                                <LabelList
                                  dataKey="maquina"
                                  position="insideLeft"
                                  offset={10}
                                  style={{ fill: "#ffffff", fontSize: 11, fontWeight: 500 }}
                                />
                                <LabelList
                                  dataKey="total"
                                  position="right"
                                  offset={8}
                                  style={{ fontSize: 11, fontWeight: 600 }}
                                  formatter={(v: number) => v.toLocaleString("pt-BR")}
                                />
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                          {dashPorMaquinaAll.length > 10 && (
                            <button
                              onClick={() => setShowAllMaq(p => !p)}
                              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 border-t border-dashed"
                            >
                              {showAllMaq
                                ? "Ver menos ↑"
                                : `Ver mais ${dashPorMaquinaAll.length - 10} máquina${dashPorMaquinaAll.length - 10 > 1 ? "s" : ""} ↓`}
                            </button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Produção Mensal — reage à máquina selecionada */}
              {(() => {
                const chartConfig: ChartConfig = {
                  total: { label: "Conforme", color: COR_VERDE },
                };
                return (
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold text-muted-foreground">
                        Produção Mensal
                        {selMaq && (
                          <span className="ml-2 font-normal" style={{ color: COR_VERDE }}>
                            · {selMaq.toUpperCase()}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                      {dashPorDia.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                      ) : (
                        <ChartContainer config={chartConfig} className="w-full [&_.recharts-wrapper]:!aspect-auto" style={{ height: 260 }}>
                          <BarChart data={dashPorDia} margin={{ top: 24, right: 8, left: -10, bottom: 4 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="label"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v: string) => v.slice(0, 3)}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  hideLabel
                                  formatter={(value, name) => [
                                    (value as number).toLocaleString("pt-BR"),
                                    name === "total" ? "Conforme" : name,
                                  ]}
                                />
                              }
                            />
                            <Bar dataKey="total" fill="var(--color-total)" radius={8}>
                              <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                                formatter={(v: number) => v > 0 ? v.toLocaleString("pt-BR") : ""}
                              />
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Tabelas por Linha / Padrão / Largura — drill-down em cascata */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Por Linha */}
              <Card className={selLinha ? "ring-2 ring-green-400" : ""}>
                <CardContent className="px-0 pb-0 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: COR_VERDE }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">
                            Linha <span className="font-normal opacity-60">(clique)</span>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Qtd.</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashPorLinha.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-5 text-center text-xs text-muted-foreground">Sem dados.</td></tr>
                        ) : (
                          <>
                            {dashPorLinha.map((row) => {
                              const ativo = selLinha === row.linha;
                              return (
                                <tr
                                  key={row.linha}
                                  onClick={() => clickLinha(row.linha)}
                                  style={{
                                    background: ativo ? "#dcfce7" : undefined,
                                    borderBottom: "1px solid #f3f4f6",
                                    cursor: "pointer",
                                    fontWeight: ativo ? 700 : undefined,
                                  }}
                                  className="hover:bg-green-50 transition-colors"
                                >
                                  <td className="px-3 py-1.5 text-xs">{row.linha}</td>
                                  <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{row.total.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5">{pctBarD(row.pct)}</td>
                                </tr>
                              );
                            })}
                            <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                              <td className="px-3 py-1.5 text-xs font-bold">Total</td>
                              <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{total1.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-xs font-bold" style={{ color: COR_VERDE }}>100,00%</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Por Padrão */}
              <Card className={selPadrao ? "ring-2 ring-green-400" : ""}>
                <CardContent className="px-0 pb-0 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: COR_VERDE }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">
                            Padrão <span className="font-normal opacity-60">(clique)</span>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Qtd.</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashPorPadrao.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-5 text-center text-xs text-muted-foreground">Sem dados.</td></tr>
                        ) : (
                          <>
                            {(showAllPadrao ? dashPorPadrao : dashPorPadrao.slice(0, 6)).map((row) => {
                              const ativo = selPadrao === row.padrao;
                              return (
                                <tr
                                  key={row.padrao}
                                  onClick={() => clickPadrao(row.padrao)}
                                  style={{
                                    background: ativo ? "#dcfce7" : undefined,
                                    borderBottom: "1px solid #f3f4f6",
                                    cursor: "pointer",
                                    fontWeight: ativo ? 700 : undefined,
                                  }}
                                  className="hover:bg-green-50 transition-colors"
                                >
                                  <td className="px-3 py-1.5 text-xs">{row.padrao}</td>
                                  <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{row.total.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5">{pctBarD(row.pct)}</td>
                                </tr>
                              );
                            })}
                            {dashPorPadrao.length > 6 && (
                              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td colSpan={3} className="px-3 py-1.5 text-center">
                                  <button
                                    onClick={() => setShowAllPadrao(v => !v)}
                                    className="text-xs font-medium hover:underline"
                                    style={{ color: COR_VERDE }}
                                  >
                                    {showAllPadrao ? "▲ ver menos" : `▼ ver mais (${dashPorPadrao.length - 6} itens)`}
                                  </button>
                                </td>
                              </tr>
                            )}
                            <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                              <td className="px-3 py-1.5 text-xs font-bold">Total</td>
                              <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{total2.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-xs font-bold" style={{ color: COR_VERDE }}>100,00%</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Por Largura */}
              <Card>
                <CardContent className="px-0 pb-0 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: COR_VERDE }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">Largura (cm)</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-white">Qtd.</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-white">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashPorLargura.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-5 text-center text-xs text-muted-foreground">Sem dados.</td></tr>
                        ) : (
                          <>
                            {(showAllLargura ? dashPorLargura : dashPorLargura.slice(0, 6)).map((row) => (
                              <tr key={row.largura} style={{ borderBottom: "1px solid #f3f4f6" }}
                                className="hover:bg-green-50 transition-colors">
                                <td className="px-3 py-1.5 text-xs font-medium">{row.largura}</td>
                                <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{row.total.toLocaleString("pt-BR")}</td>
                                <td className="px-3 py-1.5">{pctBarD(row.pct)}</td>
                              </tr>
                            ))}
                            {dashPorLargura.length > 6 && (
                              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td colSpan={3} className="px-3 py-1.5 text-center">
                                  <button
                                    onClick={() => setShowAllLargura(v => !v)}
                                    className="text-xs font-medium hover:underline"
                                    style={{ color: COR_VERDE }}
                                  >
                                    {showAllLargura ? "▲ ver menos" : `▼ ver mais (${dashPorLargura.length - 6} itens)`}
                                  </button>
                                </td>
                              </tr>
                            )}
                            <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                              <td className="px-3 py-1.5 text-xs font-bold">Total</td>
                              <td className="px-3 py-1.5 text-xs text-right font-bold" style={{ color: COR_VERDE }}>{total3.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-xs font-bold" style={{ color: COR_VERDE }}>100,00%</td>
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
      </div>

      {/* ══ DIVISOR ══ */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-muted-foreground mb-4">Produção por Máquina — Mês Atual</p>
      </div>

      {/* Cabeçalho resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Total de Máquinas</p>
          <p className="text-2xl font-bold text-foreground">{maquinas.length}</p>
          <p className="text-xs text-muted-foreground">{totalAtivas} ativas</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Produção no Mês</p>
          <p className="text-2xl font-bold text-primary">{totalGeralMes.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">peças conformes</p>
        </Card>
        <Card className="px-4 py-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Período</p>
          <p className="text-sm font-semibold text-foreground capitalize">
            {format(new Date(), "MMMM yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground">{semanas.length} semanas</p>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar máquina..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 h-8 w-48 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchDados(setSyncing)}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
        <Button
          size="sm"
          onClick={() => { setForm(EMPTY_MAQUINA); setDialogOpen(true); }}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Máquina
        </Button>
      </div>

      {/* Dialog: Adicionar Máquina */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Máquina</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex: Betoneira 01"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && salvarMaquina()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={salvarMaquina} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Máquina */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome da Máquina</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={salvarEdicao} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet: Histórico */}
      <HistoricoSheet
        maquina={maquinaSelecionada}
        open={maquinaSelecionada !== null}
        onClose={() => setMaquinaSelecionada(null)}
        canEdit={canEdit}
      />

      {/* Form: Lançamento manual — Embalagem de Perfil */}
      <EmbalagemPerfilForm
        open={lancamentoOpen}
        onClose={() => setLancamentoOpen(false)}
        onSaved={() => fetchDados(setSyncing)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {maquinas.filter((m) => norm(m.nome ?? "").includes(norm(busca))).map((m) => {
          const chave = norm(m.nome ?? "");
          const dadosMaquina = producao[chave] ?? {};
          const producaoPorSemana = semanas.map((s) => ({
            label: s.label,
            producao: dadosMaquina[s.label] ?? 0,
          }));
          const totalMes = producaoPorSemana.reduce((acc, s) => acc + s.producao, 0);

          const isEmbalagemPerfil = norm(m.nome ?? "") === norm("EMBALAGEM DE PERFIL");

          return (
            <MaquinaCard
              key={m.id}
              maquina={m}
              producaoPorSemana={producaoPorSemana}
              totalMes={totalMes}
              onClick={() => setMaquinaSelecionada(m)}
              onEdit={abrirEdicao}
              onLancar={isEmbalagemPerfil ? () => setLancamentoOpen(true) : undefined}
              canEdit={canEdit}
            />
          );
        })}
      </div>
    </div>
  );
}
