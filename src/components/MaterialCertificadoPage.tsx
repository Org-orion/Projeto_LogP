"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Leaf,
  Plus,
  Upload,
  Pencil,
  Trash2,
  FileImage,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Package,
  TrendingUp,
  ShieldCheck,
  ScanLine,
  Search,
  X,
  Calendar,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Link2,
  Inbox,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MaterialFSC {
  id: string;
  data_recebimento: string;
  tipo_material: string;
  fornecedor: string;
  quantidade: number;
  unidade: string;
  numero_nota_fiscal: string;
  codigo_rq: string;
  imagem_nf_url: string | null;
  numero_certificado_fsc: string;
  validade_certificado: string | null;
  operador: string;
  status: "pendente" | "aprovado" | "reprovado";
  observacoes: string;
  created_at: string;
}

type FormState = Omit<MaterialFSC, "id" | "created_at" | "imagem_nf_url">;

interface RegistroProducaoMDF {
  id: string;
  n_lote: string | null;
  lote_fornecedor: string | null;
  nota_fiscal: string | number | null;
  data: string | null;
  produto: string | null;
  fornecedor: string | null;
  codigo_rq: string | null;
  qtd_conforme: number | null;
  recebimento_chapa_aq01: string | number | null;
  largura_cm: number | null;
  espessura_mm: number | null;
  comprimento_cm: number | null;
}

interface GrupoMDF {
  nota_fiscal: string | null;
  data: string | null;
  fornecedor: string | null;
  registros: RegistroProducaoMDF[];
  aqs: string[];
  representante: RegistroProducaoMDF;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPOS_MATERIAL = ["Papelão", "Papel", "MDF", "Colmeia"];
const UNIDADES = ["kg", "m²", "unidades", "folhas", "m³", "peças"];

const COR_TIPO: Record<string, string> = {
  Papelão: "bg-amber-100 text-amber-800",
  Papel:   "bg-blue-100 text-blue-800",
  MDF:     "bg-emerald-100 text-emerald-800",
  Colmeia: "bg-purple-100 text-purple-800",
};

const CORES_GRAFICO: Record<string, string> = {
  Papelão: "#f59e0b",
  Papel:   "#3b82f6",
  MDF:     "#10b981",
  Colmeia: "#8b5cf6",
};

const FORNECEDORES_POR_TIPO: Record<string, string[]> = {
  MDF:     ["Flora", "Guararapes", "Berneck"],
  Papelão: ["Transa Pack", "Catre Pack"],
  Papel:   ["CPI (Cruzeiro Papéis Industriais)"],
  Colmeia: ["Hexacell"],
};

const FORM_VAZIO: FormState = {
  data_recebimento: new Date().toISOString().split("T")[0],
  tipo_material: "",
  fornecedor: "",
  quantidade: 0,
  unidade: "kg",
  numero_nota_fiscal: "",
  codigo_rq: "",
  numero_certificado_fsc: "",
  validade_certificado: "",
  operador: "",
  status: "pendente",
  observacoes: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  try { return format(new Date(iso + "T12:00:00"), "dd/MM/yyyy"); } catch { return iso; }
}

function statusCertificado(validade: string | null) {
  if (!validade) return { label: "Sem validade", cor: "bg-gray-100 text-gray-500", dias: null };
  const dias = differenceInDays(new Date(validade), new Date());
  if (dias < 0) return { label: `Vencido há ${Math.abs(dias)}d`, cor: "bg-red-100 text-red-700",  dias };
  if (dias <= 30) return { label: `Vence em ${dias}d`,           cor: "bg-amber-100 text-amber-700", dias };
  return             { label: `Válido (${dias}d)`,               cor: "bg-emerald-100 text-emerald-700", dias };
}

function tipoMaterialPorFornecedor(fornecedor: string | null): string {
  if (!fornecedor) return "Papelão";
  const f = fornecedor.toLowerCase();
  if (f.includes("cpi") || f.includes("cruzeiro")) return "Papel";
  if (f.includes("hexacell"))                       return "Colmeia";
  return "Papelão";
}

function BadgeStatus({ status }: { status: string }) {
  if (status === "aprovado")
    return <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Aprovado</Badge>;
  if (status === "reprovado")
    return <Badge className="bg-red-100 text-red-700 border-0 gap-1"><XCircle className="h-3 w-3" />Reprovado</Badge>;
  return   <Badge className="bg-amber-100 text-amber-700 border-0 gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function MaterialCertificadoPage() {
  const [registros, setRegistros]   = useState<MaterialFSC[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva]     = useState("visao-geral");

  // Filtros
  const [filtroTipo,   setFiltroTipo]   = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBusca,  setFiltroBusca]  = useState("");

  // Dialog formulário
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando,     setEditando]     = useState<MaterialFSC | null>(null);
  const [form,         setForm]         = useState<FormState>(FORM_VAZIO);
  const [salvando,     setSalvando]     = useState(false);

  // Upload de imagem
  const [arquivoNF,  setArquivoNF]  = useState<File | null>(null);
  const [previewNF,  setPreviewNF]  = useState<string | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  // Dialog imagem
  const [imagemDialogUrl, setImagemDialogUrl] = useState<string | null>(null);

  // Exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [excluindoNFVinculada, setExcluindoNFVinculada] = useState<string | null>(null);

  // Autocomplete RQ
  const [sugestoesRQ, setSugestoesRQ] = useState<string[]>([]);
  const rqDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aba "Vincular NF ao MDF"
  const [mdfRegistros,  setMdfRegistros]  = useState<RegistroProducaoMDF[]>([]);
  const [mdfGrupos,     setMdfGrupos]     = useState<GrupoMDF[]>([]);
  const [mdfCarregando, setMdfCarregando] = useState(false);
  const [mdfBusca,      setMdfBusca]      = useState("");
  const [vincularReg,   setVincularReg]   = useState<RegistroProducaoMDF | null>(null);
  const [vincularGrupo, setVincularGrupo] = useState<GrupoMDF | null>(null);
  const [grupoAQsAberto, setGrupoAQsAberto] = useState<GrupoMDF | null>(null);
  const [loteDetalheAberto, setLoteDetalheAberto] = useState<GrupoMDF | null>(null);
  const [loteDetalheAbertoTipo, setLoteDetalheAbertoTipo] = useState<string>("MDF");
  const [vincularArquivo,  setVincularArquivo]  = useState<File | null>(null);
  const [vincularPreview,  setVincularPreview]  = useState<string | null>(null);
  const [vincularSalvando, setVincularSalvando] = useState(false);
  const [vincularForm, setVincularForm] = useState({
    numero_nota_fiscal: "",
    numero_certificado_fsc: "",
    validade_certificado: "",
    fornecedor: "",
    operador: "",
    observacoes: "",
  });
  const vincularArquivoRef = useRef<HTMLInputElement>(null);

  // Aba "Vincular NF" — tipo de material selecionado + outros materiais
  const [tipoVincular,     setTipoVincular]     = useState("MDF");
  const [outrosGrupos,     setOutrosGrupos]     = useState<GrupoMDF[]>([]);
  const [outrosCarregando, setOutrosCarregando] = useState(false);
  const [outrosBusca,      setOutrosBusca]      = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const carregarRegistros = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("material_certificado_fsc")
      .select("*")
      .order("data_recebimento", { ascending: false })
      .limit(5000);
    if (error) {
      toast.error("Erro ao carregar registros: " + error.message);
    } else {
      setRegistros(data ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregarRegistros(); }, [carregarRegistros]);

  const carregarMDFRegistros = useCallback(async () => {
    setMdfCarregando(true);

    const { data, error } = await supabase
      .from("registros_producao")
      .select("*")
      .ilike("maquina", "recebimento de chapa%")
      .order("data", { ascending: false })
      .limit(2000);

    if (error) {
      toast.error("Erro ao carregar registros de MDF: " + error.message);
      setMdfCarregando(false);
      return;
    }

    const regs = (data ?? []) as RegistroProducaoMDF[];
    setMdfRegistros(regs);

    // Agrupa por nota_fiscal — uma linha por NF única
    const mapa = new Map<string, GrupoMDF>();
    for (const r of regs) {
      const nfNormalizada =
        r.nota_fiscal != null ? String(r.nota_fiscal).trim() : null;
      const chave = nfNormalizada || `__sem_nf_${r.id}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          nota_fiscal: nfNormalizada,
          data: r.data,
          fornecedor: r.fornecedor,
          registros: [],
          aqs: [],
          representante: r,
        });
      }
      const grupo = mapa.get(chave)!;
      grupo.registros.push(r);
      const aq = r.recebimento_chapa_aq01 != null ? String(r.recebimento_chapa_aq01).trim() : null;
      if (aq && !grupo.aqs.includes(aq)) {
        grupo.aqs.push(aq);
      }
    }

    setMdfGrupos(Array.from(mapa.values()));
    setMdfCarregando(false);
  }, []);

  const carregarOutrosMateriais = useCallback(async () => {
    setOutrosCarregando(true);
    const { data, error } = await supabase
      .from("registros_producao")
      .select("*")
      .ilike("maquina", "recebimento de materiais%")
      .order("data", { ascending: false })
      .limit(2000);
    if (error) {
      toast.error("Erro ao carregar registros: " + error.message);
      setOutrosCarregando(false);
      return;
    }
    const regs = (data ?? []) as RegistroProducaoMDF[];
    const mapa = new Map<string, GrupoMDF>();
    for (const r of regs) {
      const nfNorm = r.nota_fiscal != null ? String(r.nota_fiscal).trim() : null;
      const chave  = nfNorm || `__sem_nf_${r.id}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, { nota_fiscal: nfNorm, data: r.data, fornecedor: r.fornecedor, registros: [], aqs: [], representante: r });
      }
      const grupo = mapa.get(chave)!;
      grupo.registros.push(r);
    }
    setOutrosGrupos(Array.from(mapa.values()));
    setOutrosCarregando(false);
  }, []);

  useEffect(() => {
    if (abaAtiva === "vincular-nf") {
      if (tipoVincular === "MDF") carregarMDFRegistros();
      else carregarOutrosMateriais();
    }
  }, [abaAtiva, tipoVincular, carregarMDFRegistros, carregarOutrosMateriais]);

  // ─── Autocomplete RQ ────────────────────────────────────────────────────────

  function handleRQChange(valor: string) {
    setForm((f) => ({ ...f, codigo_rq: valor }));
    if (rqDebounceRef.current) clearTimeout(rqDebounceRef.current);
    if (valor.length < 2) { setSugestoesRQ([]); return; }
    rqDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("registros_producao")
        .select("codigo_rq")
        .ilike("codigo_rq", `%${valor}%`)
        .limit(8);
      const unicos = [...new Set((data ?? []).map((r: any) => r.codigo_rq).filter(Boolean))] as string[];
      setSugestoesRQ(unicos);
    }, 300);
  }

  // ─── Formulário ─────────────────────────────────────────────────────────────

  function abrirNovoRegistro() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setArquivoNF(null);
    setPreviewNF(null);
    setSugestoesRQ([]);
    setDialogAberto(true);
  }

  function abrirEditar(r: MaterialFSC) {
    setEditando(r);
    const { id, created_at, imagem_nf_url, ...rest } = r;
    setForm(rest);
    setArquivoNF(null);
    setPreviewNF(r.imagem_nf_url);
    setSugestoesRQ([]);
    setDialogAberto(true);
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNF(file);
    setPreviewNF(URL.createObjectURL(file));
  }

  async function fazerUploadNF(registroId: string): Promise<string | null> {
    if (!arquivoNF) return editando?.imagem_nf_url ?? null;
    setUploadando(true);
    const ext = arquivoNF.name.split(".").pop() ?? "jpg";
    const caminho = `${form.tipo_material}/${registroId}.${ext}`;
    const { error } = await supabase.storage
      .from("nf-materiais-fsc")
      .upload(caminho, arquivoNF, { upsert: true });
    setUploadando(false);
    if (error) { toast.error("Erro no upload da NF: " + error.message); return null; }
    const { data } = supabase.storage.from("nf-materiais-fsc").getPublicUrl(caminho);
    return data.publicUrl;
  }

  async function salvar() {
    if (!form.tipo_material)       { toast.error("Selecione o tipo de material"); return; }
    if (!form.data_recebimento)    { toast.error("Informe a data de recebimento"); return; }
    if (!form.fornecedor.trim())   { toast.error("Informe o fornecedor"); return; }
    if ((form.quantidade ?? 0) <= 0) { toast.error("Informe uma quantidade válida"); return; }

    setSalvando(true);
    try {
      if (editando) {
        const imgUrl = await fazerUploadNF(editando.id);
        const { error } = await supabase
          .from("material_certificado_fsc")
          .update({ ...form, imagem_nf_url: imgUrl })
          .eq("id", editando.id);
        if (error) throw error;
        toast.success("Registro atualizado com sucesso");
      } else {
        const { data: novo, error: errIns } = await supabase
          .from("material_certificado_fsc")
          .insert({ ...form, imagem_nf_url: null })
          .select()
          .single();
        if (errIns) throw errIns;
        const imgUrl = await fazerUploadNF(novo.id);
        if (imgUrl) {
          await supabase
            .from("material_certificado_fsc")
            .update({ imagem_nf_url: imgUrl })
            .eq("id", novo.id);
        }
        toast.success("Registro cadastrado com sucesso");
      }
      setDialogAberto(false);
      carregarRegistros();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    const { error } = await supabase.from("material_certificado_fsc").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Registro excluído");
    setExcluindoId(null);
    carregarRegistros();
  }

  async function excluirNFVinculada(id: string, imagemUrl: string | null) {
    if (imagemUrl) {
      const partes = imagemUrl.split("/nf-materiais-fsc/");
      if (partes.length === 2) {
        await supabase.storage.from("nf-materiais-fsc").remove([partes[1].split("?")[0]]);
      }
    }
    const { error } = await supabase.from("material_certificado_fsc").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir NF: " + error.message); return; }
    toast.success("NF vinculada removida com sucesso.");
    setExcluindoNFVinculada(null);
    carregarRegistros();
    if (tipoVincular === "MDF") carregarMDFRegistros(); else carregarOutrosMateriais();
  }

  async function vincularNFaoMaterial() {
    if (!vincularReg) return;
    if (!vincularArquivo) { toast.error("Selecione a imagem da Nota Fiscal"); return; }
    if (!vincularForm.fornecedor) { toast.error("Informe o fornecedor"); return; }

    const tipoMat = tipoVincular === "MDF"
      ? "MDF"
      : tipoMaterialPorFornecedor(vincularGrupo?.representante.fornecedor ?? null);

    const quantidade = tipoVincular === "MDF"
      ? parseFloat(
          (vincularGrupo?.registros ?? []).reduce((soma, r) => {
            return soma + (r.comprimento_cm ?? 0) * (r.largura_cm ?? 0) * ((r.espessura_mm ?? 0) / 1000) * (r.qtd_conforme ?? 0);
          }, 0).toFixed(4)
        )
      : (vincularGrupo?.registros ?? []).reduce((soma, r) => soma + (r.qtd_conforme ?? 0), 0);

    const unidade = tipoVincular === "MDF" ? "m³" : "kg";

    setVincularSalvando(true);
    try {
      const { data: novo, error: errIns } = await supabase
        .from("material_certificado_fsc")
        .insert({
          tipo_material: tipoMat,
          data_recebimento: vincularReg.data ?? new Date().toISOString().split("T")[0],
          fornecedor: vincularForm.fornecedor,
          quantidade,
          unidade,
          numero_nota_fiscal: vincularForm.numero_nota_fiscal,
          codigo_rq: "",
          imagem_nf_url: null,
          numero_certificado_fsc: vincularForm.numero_certificado_fsc,
          validade_certificado: vincularForm.validade_certificado || null,
          operador: vincularForm.operador,
          status: "aprovado",
          observacoes: vincularForm.observacoes,
        })
        .select()
        .single();
      if (errIns) throw errIns;

      const ext = vincularArquivo.name.split(".").pop() ?? "jpg";
      const caminho = `${tipoMat}/${novo.id}.${ext}`;
      const { error: errUp } = await supabase.storage
        .from("nf-materiais-fsc")
        .upload(caminho, vincularArquivo, { upsert: true });
      if (errUp) throw errUp;

      const { data: urlData } = supabase.storage.from("nf-materiais-fsc").getPublicUrl(caminho);
      await supabase.from("material_certificado_fsc").update({ imagem_nf_url: urlData.publicUrl }).eq("id", novo.id);

      toast.success(`NF vinculada com sucesso ao ${tipoMat}!`);
      setVincularReg(null);
      setVincularArquivo(null);
      setVincularPreview(null);
      setVincularForm({ numero_nota_fiscal: "", numero_certificado_fsc: "", validade_certificado: "", fornecedor: "", operador: "", observacoes: "" });
      carregarRegistros();
      if (tipoVincular === "MDF") carregarMDFRegistros(); else carregarOutrosMateriais();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao vincular NF");
    } finally {
      setVincularSalvando(false);
    }
  }

  // ─── Dados derivados ─────────────────────────────────────────────────────────

  const registrosFiltrados = registros.filter((r) => {
    const matchTipo   = filtroTipo === "todos" || r.tipo_material === filtroTipo;
    const matchStatus =
      filtroStatus === "todos"   ? true :
      filtroStatus === "com-nf"  ? !!r.imagem_nf_url :
      filtroStatus === "sem-nf"  ? !r.imagem_nf_url :
      r.status === filtroStatus;
    const q = filtroBusca.toLowerCase();
    const matchBusca  = !q ||
      r.fornecedor.toLowerCase().includes(q) ||
      r.numero_nota_fiscal.toLowerCase().includes(q) ||
      r.codigo_rq.toLowerCase().includes(q) ||
      r.numero_certificado_fsc.toLowerCase().includes(q) ||
      r.operador.toLowerCase().includes(q);
    return matchTipo && matchStatus && matchBusca;
  });

  const agora = new Date();
  const totalMes = registros.filter((r) => {
    const d = new Date(r.data_recebimento + "T12:00:00");
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  }).length;

  const comNF = registros.filter((r) => r.imagem_nf_url).length;
  const pctNF = registros.length > 0 ? Math.round((comNF / registros.length) * 100) : 0;

  const certVencendoBreve = registros.filter((r) => {
    if (!r.validade_certificado) return false;
    const d = differenceInDays(new Date(r.validade_certificado), agora);
    return d >= 0 && d <= 30;
  }).length;

  const certVencidos = registros.filter((r) => {
    if (!r.validade_certificado) return false;
    return differenceInDays(new Date(r.validade_certificado), agora) < 0;
  }).length;

  const dadosPorTipo = TIPOS_MATERIAL.map((tipo) => {
    const lista = registros.filter((r) => r.tipo_material === tipo);
    return {
      tipo,
      quantidade: lista.reduce((s, r) => s + (r.quantidade || 0), 0),
      registros: lista.length,
    };
  });

  // Gráfico: últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
    return { label: format(d, "MMM/yy", { locale: ptBR }), mes: d.getMonth(), ano: d.getFullYear() };
  });
  const dadosMensais = meses.map(({ label, mes, ano }) => {
    const obj: Record<string, string | number> = { mes: label };
    TIPOS_MATERIAL.forEach((tipo) => {
      obj[tipo] = registros
        .filter((r) => {
          const d = new Date(r.data_recebimento + "T12:00:00");
          return d.getMonth() === mes && d.getFullYear() === ano && r.tipo_material === tipo;
        })
        .reduce((s, r) => s + (r.quantidade || 0), 0);
    });
    return obj;
  });

  // Certificados únicos (por número)
  const certificadosUnicos = Array.from(
    new Map(
      registros
        .filter((r) => r.numero_certificado_fsc)
        .map((r) => [r.numero_certificado_fsc, r])
    ).values()
  );

  const temFiltro = filtroTipo !== "todos" || filtroStatus !== "todos" || !!filtroBusca;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Material Certificado (FSC)</h2>
            <p className="text-xs text-muted-foreground">Rastreabilidade de materiais com certificação florestal FSC</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={carregarRegistros} disabled={carregando}>
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={abrirNovoRegistro} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="visao-geral" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Visão Geral
          </TabsTrigger>
          <TabsTrigger value="registros" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />Registros
          </TabsTrigger>
          <TabsTrigger value="vincular-nf" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />Vincular NF
          </TabsTrigger>
          <TabsTrigger value="certificados" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />Certificados FSC
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA: Visão Geral ─────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="space-y-4 mt-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />Recebidos este mês
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{totalMes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">de {registros.length} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5" />NF Digitalizada
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{pctNF}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{comNF} de {registros.length} reg.</p>
              </CardContent>
            </Card>

            <Card className={certVencendoBreve > 0 ? "border-amber-300" : ""}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className={`h-3.5 w-3.5 ${certVencendoBreve > 0 ? "text-amber-500" : ""}`} />
                  Cert. vencendo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${certVencendoBreve > 0 ? "text-amber-600" : ""}`}>{certVencendoBreve}</p>
                <p className="text-xs text-muted-foreground mt-0.5">nos próximos 30 dias</p>
              </CardContent>
            </Card>

            <Card className={certVencidos > 0 ? "border-red-300" : ""}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <XCircle className={`h-3.5 w-3.5 ${certVencidos > 0 ? "text-red-500" : ""}`} />
                  Cert. vencidos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${certVencidos > 0 ? "text-red-600" : ""}`}>{certVencidos}</p>
                <p className="text-xs text-muted-foreground mt-0.5">requerem renovação</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards por tipo — clicáveis */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dadosPorTipo.map(({ tipo, quantidade, registros: qtdReg }) => (
              <Card
                key={tipo}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setFiltroTipo(tipo); setAbaAtiva("registros"); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${COR_TIPO[tipo]} border-0 text-xs`}>{tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{qtdReg} reg.</span>
                  </div>
                  <p className="text-xl font-bold">{quantidade.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">quantidade acumulada</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráfico mensal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Recebimento por Material — Últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registros.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dadosMensais} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {TIPOS_MATERIAL.map((tipo, i) => (
                      <Bar
                        key={tipo}
                        dataKey={tipo}
                        fill={CORES_GRAFICO[tipo]}
                        stackId="a"
                        radius={i === TIPOS_MATERIAL.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Últimas NFs cadastradas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Últimas notas cadastradas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {carregando ? (
                <div className="flex items-center justify-center py-10">
                  <SpinnerCustom />
                </div>
              ) : registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-30" />
                  <span className="text-sm">Nenhum registro encontrado.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28 pl-4">Data</TableHead>
                        <TableHead>Nota Fiscal</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right pr-4">Quantidade</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.slice(0, 8).map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/40">
                          <TableCell className="pl-4 text-xs text-muted-foreground">
                            {fmtData(r.data_recebimento)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {r.numero_nota_fiscal || <span className="text-muted-foreground italic">—</span>}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={r.fornecedor}>
                            {r.fornecedor}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${COR_TIPO[r.tipo_material] ?? "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                              {r.tipo_material}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4 font-mono text-sm">
                            {r.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                            <span className="text-muted-foreground text-xs ml-1">{r.unidade}</span>
                          </TableCell>
                          <TableCell>
                            <BadgeStatus status={r.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {registros.length > 8 && (
                <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
                  <span>Exibindo 8 de {registros.length} registros</span>
                  <button
                    className="text-emerald-700 font-medium hover:underline"
                    onClick={() => setAbaAtiva("registros")}
                  >
                    Ver todos →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Registros ───────────────────────────────────────────────── */}
        <TabsContent value="registros" className="space-y-4 mt-4">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor, NF, RQ, certificado..."
                className="pl-8 h-8 w-64 text-sm"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
              />
              {filtroBusca && (
                <button className="absolute right-2 top-2" onClick={() => setFiltroBusca("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_MATERIAL.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="com-nf">Com NF digitalizada</SelectItem>
                <SelectItem value="sem-nf">Sem NF digitalizada</SelectItem>
              </SelectContent>
            </Select>

            {temFiltro && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => { setFiltroTipo("todos"); setFiltroStatus("todos"); setFiltroBusca(""); }}
              >
                <X className="h-3 w-3" />Limpar
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {registrosFiltrados.length} registro(s)
            </span>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead>Nota Fiscal</TableHead>
                      <TableHead>Código RQ</TableHead>
                      <TableHead>NF Digital</TableHead>
                      <TableHead>Certificado FSC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carregando ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <SpinnerCustom className="justify-center" />
                        </TableCell>
                      </TableRow>
                    ) : registrosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                          {temFiltro ? "Nenhum registro encontrado para os filtros selecionados." : "Nenhum registro cadastrado ainda."}
                        </TableCell>
                      </TableRow>
                    ) : registrosFiltrados.map((r) => {
                      const cs = statusCertificado(r.validade_certificado);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{fmtData(r.data_recebimento)}</TableCell>
                          <TableCell>
                            <Badge className={`${COR_TIPO[r.tipo_material] ?? "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                              {r.tipo_material}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[10rem] truncate" title={r.fornecedor}>
                            {r.fornecedor || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {r.quantidade?.toLocaleString("pt-BR")} <span className="text-muted-foreground">{r.unidade}</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{r.numero_nota_fiscal || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{r.codigo_rq || "—"}</TableCell>
                          <TableCell>
                            {r.imagem_nf_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                                onClick={() => setImagemDialogUrl(r.imagem_nf_url!)}
                              >
                                <FileImage className="h-3 w-3" />Ver NF
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Pendente</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-mono">{r.numero_certificado_fsc || "—"}</span>
                              {r.validade_certificado && (
                                <Badge className={`${cs.cor} border-0 text-[10px] w-fit`}>{cs.label}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><BadgeStatus status={r.status} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => abrirEditar(r)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => setExcluindoId(r.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Vincular NF ───────────────────────────────────────────────── */}
        <TabsContent value="vincular-nf" className="space-y-4 mt-4">

          {/* Seletor de tipo de material */}
          <div className="flex gap-2 flex-wrap">
            {TIPOS_MATERIAL.map((tipo) => (
              <Button
                key={tipo}
                variant={tipoVincular === tipo ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setTipoVincular(tipo)}
              >
                <span className={`w-2 h-2 rounded-full inline-block ${
                  tipo === "MDF"     ? "bg-emerald-500" :
                  tipo === "Papelão" ? "bg-amber-500"   :
                  tipo === "Papel"   ? "bg-blue-500"    : "bg-purple-500"
                }`} />
                {tipo}
              </Button>
            ))}
          </div>

          {tipoVincular === "MDF" ? (
            <>
              {/* Descrição MDF */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Link2 className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-800 space-y-0.5">
                  <p className="font-semibold">Recebimentos de Chapa — Vinculação de Nota Fiscal</p>
                  <p>Registros da máquina <strong>Recebimento de Chapa</strong>. A coluna <strong>AQs Geradas</strong> mostra quantos registros de produção utilizaram aquela chapa. Clique em <strong>Vincular NF</strong> para anexar a imagem da nota fiscal.</p>
                </div>
              </div>

              {/* Busca + Refresh MDF */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nota fiscal, fornecedor..."
                    className="pl-8 h-8 text-sm"
                    value={mdfBusca}
                    onChange={(e) => setMdfBusca(e.target.value)}
                  />
                  {mdfBusca && (
                    <button className="absolute right-2 top-2" onClick={() => setMdfBusca("")}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={carregarMDFRegistros} disabled={mdfCarregando}>
                  <RefreshCw className={`h-3.5 w-3.5 ${mdfCarregando ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {mdfGrupos.filter((g) => {
                    const q = mdfBusca.toLowerCase();
                    if (!q) return true;
                    return (
                      (g.fornecedor ?? "").toLowerCase().includes(q) ||
                      String(g.representante.nota_fiscal ?? "").toLowerCase().includes(q)
                    );
                  }).length} lote(s)
                </span>
              </div>

              {/* Tabela de MDF */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead>Nota Fiscal</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-center">AQs Geradas</TableHead>
                          <TableHead>Status NF</TableHead>
                          <TableHead className="w-28">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mdfCarregando ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <SpinnerCustom className="justify-center" />
                            </TableCell>
                          </TableRow>
                        ) : (() => {
                          const q = mdfBusca.toLowerCase();
                          const filtrados = mdfGrupos.filter((g) => {
                            if (!q) return true;
                            return (
                              (g.fornecedor ?? "").toLowerCase().includes(q) ||
                              String(g.representante.nota_fiscal ?? "").toLowerCase().includes(q)
                            );
                          });
                          if (filtrados.length === 0) return (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                {mdfBusca ? "Nenhum lote encontrado para a busca." : "Nenhum registro de Recebimento de Chapa encontrado."}
                              </TableCell>
                            </TableRow>
                          );
                          return filtrados.map((grupo) => {
                            const rep = grupo.representante;
                            const nfVinculada = registros.find(
                              (fsc) => fsc.tipo_material === "MDF" && fsc.numero_nota_fiscal === grupo.nota_fiscal && !!grupo.nota_fiscal
                            );
                            return (
                              <TableRow
                                key={grupo.nota_fiscal ?? rep.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => { setLoteDetalheAbertoTipo("MDF"); setLoteDetalheAberto(grupo); }}
                              >
                                <TableCell className="text-xs">{grupo.data ? fmtData(grupo.data) : "—"}</TableCell>
                                <TableCell className="text-xs font-mono font-medium">{grupo.nota_fiscal ?? "—"}</TableCell>
                                <TableCell className="text-xs max-w-[10rem] truncate" title={grupo.fornecedor ?? ""}>{grupo.fornecedor || "—"}</TableCell>
                                <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); if (grupo.aqs.length > 0) setGrupoAQsAberto(grupo); }}>
                                  <Badge className={`border-0 text-xs cursor-pointer ${grupo.aqs.length > 0 ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-500"}`}>
                                    {grupo.aqs.length}
                                    {grupo.aqs.length > 0 && <ExternalLink className="h-2.5 w-2.5 ml-1" />}
                                  </Badge>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {nfVinculada ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-xs">
                                      <CheckCircle2 className="h-3 w-3" />NF Vinculada
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-xs">
                                      <Clock className="h-3 w-3" />Aguardando NF
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {nfVinculada ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1 text-emerald-600"
                                        onClick={() => setImagemDialogUrl(nfVinculada.imagem_nf_url!)}
                                      >
                                        <FileImage className="h-3 w-3" />Ver NF
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                        onClick={() => setExcluindoNFVinculada(nfVinculada.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1"
                                      onClick={() => {
                                        setVincularReg(rep);
                                        setVincularGrupo(grupo);
                                        setVincularArquivo(null);
                                        setVincularPreview(null);
                                        setVincularForm({
                                          numero_nota_fiscal: grupo.nota_fiscal ?? "",
                                          numero_certificado_fsc: "",
                                          validade_certificado: "",
                                          fornecedor: rep.fornecedor ?? "",
                                          operador: "",
                                          observacoes: "",
                                        });
                                      }}
                                    >
                                      <Link2 className="h-3 w-3" />Vincular NF
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Descrição outros materiais */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Link2 className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-800 space-y-0.5">
                  <p className="font-semibold">Recebimento de Materiais — {tipoVincular}</p>
                  <p>Registros da máquina <strong>Recebimento de Materiais</strong> filtrados por tipo: <strong>{tipoVincular}</strong>. O tipo é determinado automaticamente pelo fornecedor (CPI = Papel, Hexacell = Colmeia, demais = Papelão).</p>
                </div>
              </div>

              {/* Busca + Refresh outros */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nota fiscal, fornecedor..."
                    className="pl-8 h-8 text-sm"
                    value={outrosBusca}
                    onChange={(e) => setOutrosBusca(e.target.value)}
                  />
                  {outrosBusca && (
                    <button className="absolute right-2 top-2" onClick={() => setOutrosBusca("")}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={carregarOutrosMateriais} disabled={outrosCarregando}>
                  <RefreshCw className={`h-3.5 w-3.5 ${outrosCarregando ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>

              {/* Tabela outros materiais */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead>Nota Fiscal</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status NF</TableHead>
                          <TableHead className="w-28">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outrosCarregando ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <SpinnerCustom className="justify-center" />
                            </TableCell>
                          </TableRow>
                        ) : (() => {
                          const q = outrosBusca.toLowerCase();
                          const filtrados = outrosGrupos.filter((g) => {
                            const tipo = tipoMaterialPorFornecedor(g.representante.fornecedor);
                            if (tipo !== tipoVincular) return false;
                            if (!q) return true;
                            return (
                              (g.fornecedor ?? "").toLowerCase().includes(q) ||
                              String(g.representante.nota_fiscal ?? "").toLowerCase().includes(q)
                            );
                          });
                          if (filtrados.length === 0) return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                {outrosBusca
                                  ? "Nenhum lote encontrado para a busca."
                                  : `Nenhum registro de ${tipoVincular} encontrado na máquina Recebimento de Materiais.`}
                              </TableCell>
                            </TableRow>
                          );
                          return filtrados.map((grupo) => {
                            const rep  = grupo.representante;
                            const tipo = tipoMaterialPorFornecedor(rep.fornecedor);
                            const nfVinculada = registros.find(
                              (fsc) => fsc.tipo_material === tipo && fsc.numero_nota_fiscal === grupo.nota_fiscal && !!grupo.nota_fiscal
                            );
                            return (
                              <TableRow key={grupo.nota_fiscal ?? rep.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setLoteDetalheAbertoTipo(tipo); setLoteDetalheAberto(grupo); }}>
                                <TableCell className="text-xs">{grupo.data ? fmtData(grupo.data) : "—"}</TableCell>
                                <TableCell className="text-xs font-mono font-medium">{grupo.nota_fiscal ?? "—"}</TableCell>
                                <TableCell className="text-xs max-w-[10rem] truncate" title={grupo.fornecedor ?? ""}>{grupo.fornecedor || "—"}</TableCell>
                                <TableCell>
                                  <Badge className={`${COR_TIPO[tipo] ?? "bg-gray-100 text-gray-700"} border-0 text-xs`}>{tipo}</Badge>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {nfVinculada ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-xs">
                                      <CheckCircle2 className="h-3 w-3" />NF Vinculada
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-xs">
                                      <Clock className="h-3 w-3" />Aguardando NF
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {nfVinculada ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1 text-emerald-600"
                                        onClick={() => setImagemDialogUrl(nfVinculada.imagem_nf_url!)}
                                      >
                                        <FileImage className="h-3 w-3" />Ver NF
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                        onClick={() => setExcluindoNFVinculada(nfVinculada.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1"
                                      onClick={() => {
                                        setVincularReg(rep);
                                        setVincularGrupo(grupo);
                                        setVincularArquivo(null);
                                        setVincularPreview(null);
                                        setVincularForm({
                                          numero_nota_fiscal: grupo.nota_fiscal ?? "",
                                          numero_certificado_fsc: "",
                                          validade_certificado: "",
                                          fornecedor: rep.fornecedor ?? "",
                                          operador: "",
                                          observacoes: "",
                                        });
                                      }}
                                    >
                                      <Link2 className="h-3 w-3" />Vincular NF
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── ABA: Certificados FSC ────────────────────────────────────────── */}
        <TabsContent value="certificados" className="space-y-4 mt-4">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Válido (&gt;30 dias)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Vencendo (≤30 dias)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Vencido</span>
          </div>

          {certificadosUnicos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum certificado FSC cadastrado ainda.</p>
              <p className="text-xs mt-1">Cadastre um registro com o número do certificado FSC.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificadosUnicos.map((r) => {
                const cs = statusCertificado(r.validade_certificado);
                const barCor =
                  cs.dias === null ? "bg-gray-300" :
                  cs.dias < 0     ? "bg-red-500" :
                  cs.dias <= 30   ? "bg-amber-500" :
                                    "bg-emerald-500";
                // Quantos registros usam este certificado
                const qtdVinculados = registros.filter(
                  (x) => x.numero_certificado_fsc === r.numero_certificado_fsc
                ).length;

                return (
                  <Card key={r.numero_certificado_fsc} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${barCor}`} />
                    <CardContent className="pl-5 py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Certificado FSC</p>
                          <p className="text-sm font-bold font-mono leading-tight">{r.numero_certificado_fsc}</p>
                        </div>
                        <Badge className={`${cs.cor} border-0 text-[10px] shrink-0`}>{cs.label}</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fornecedor</span>
                          <span className="font-medium text-right max-w-[60%] truncate" title={r.fornecedor}>{r.fornecedor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tipo principal</span>
                          <Badge className={`${COR_TIPO[r.tipo_material] ?? "bg-gray-100 text-gray-700"} border-0 text-[10px]`}>{r.tipo_material}</Badge>
                        </div>
                        {r.validade_certificado && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Validade</span>
                            <span className="font-medium">{fmtData(r.validade_certificado)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registros vinculados</span>
                          <span className="font-medium">{qtdVinculados}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs gap-1.5"
                        onClick={() => {
                          setFiltroBusca(r.numero_certificado_fsc);
                          setFiltroTipo("todos");
                          setFiltroStatus("todos");
                          setAbaAtiva("registros");
                        }}
                      >
                        <Search className="h-3 w-3" />Ver registros vinculados
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialog: Novo / Editar ────────────────────────────────────────────── */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              {editando ? "Editar Registro FSC" : "Novo Registro de Material Certificado"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Material *</Label>
              <Select
                value={form.tipo_material}
                onValueChange={(v) => {
                  const fornecedores = FORNECEDORES_POR_TIPO[v] ?? [];
                  const autoFornecedor = fornecedores.length === 1 ? fornecedores[0] : "";
                  const autoUnidade = v === "MDF" ? "m³" : undefined;
                  setForm((f) => ({
                    ...f,
                    tipo_material: v,
                    fornecedor: fornecedores.includes(f.fornecedor) ? f.fornecedor : autoFornecedor,
                    ...(autoUnidade ? { unidade: autoUnidade } : {}),
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {TIPOS_MATERIAL.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Data de Recebimento *</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={form.data_recebimento}
                onChange={(e) => setForm((f) => ({ ...f, data_recebimento: e.target.value }))}
              />
            </div>

            {/* Fornecedor */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Fornecedor *</Label>
              <Select
                value={form.fornecedor}
                onValueChange={(v) => setForm((f) => ({ ...f, fornecedor: v }))}
                disabled={!form.tipo_material}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={form.tipo_material ? "Selecionar fornecedor..." : "Selecione o tipo de material primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {(FORNECEDORES_POR_TIPO[form.tipo_material] ?? []).map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-8 text-sm"
                placeholder="0"
                value={form.quantidade || ""}
                onChange={(e) => setForm((f) => ({ ...f, quantidade: Number(e.target.value) }))}
              />
            </div>

            {/* Unidade */}
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Select value={form.unidade} onValueChange={(v) => setForm((f) => ({ ...f, unidade: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Número NF */}
            <div className="space-y-1.5">
              <Label className="text-xs">Número da Nota Fiscal</Label>
              <Input
                className="h-8 text-sm font-mono"
                placeholder="NF-XXXXX"
                value={form.numero_nota_fiscal}
                onChange={(e) => setForm((f) => ({ ...f, numero_nota_fiscal: e.target.value }))}
              />
            </div>

            {/* Código RQ com autocomplete */}
            <div className="space-y-1.5 relative">
              <Label className="text-xs flex items-center gap-1">
                <ScanLine className="h-3 w-3 text-primary" />Código RQ (Registro de Qualidade)
              </Label>
              <Input
                className="h-8 text-sm font-mono"
                placeholder="AQ-XXX-YYYY"
                value={form.codigo_rq}
                onChange={(e) => handleRQChange(e.target.value)}
                onBlur={() => setTimeout(() => setSugestoesRQ([]), 200)}
              />
              {sugestoesRQ.length > 0 && (
                <div className="absolute z-20 top-full mt-0.5 bg-white border rounded-md shadow-lg w-full max-h-36 overflow-y-auto">
                  {sugestoesRQ.map((rq) => (
                    <button
                      key={rq}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted font-mono"
                      onMouseDown={() => { setForm((f) => ({ ...f, codigo_rq: rq })); setSugestoesRQ([]); }}
                    >
                      {rq}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Certificado FSC */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />Número do Certificado FSC
              </Label>
              <Input
                className="h-8 text-sm font-mono"
                placeholder="FSC-CXXXXX"
                value={form.numero_certificado_fsc}
                onChange={(e) => setForm((f) => ({ ...f, numero_certificado_fsc: e.target.value }))}
              />
            </div>

            {/* Validade Certificado */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />Validade do Certificado
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={form.validade_certificado ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, validade_certificado: e.target.value || null }))}
              />
            </div>

            {/* Operador */}
            <div className="space-y-1.5">
              <Label className="text-xs">Operador Responsável</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Nome do operador"
                value={form.operador}
                onChange={(e) => setForm((f) => ({ ...f, operador: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Status do Registro</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload NF */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Upload className="h-3 w-3" />Imagem da Nota Fiscal (escaneada)
              </Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => inputArquivoRef.current?.click()}
              >
                {previewNF ? (
                  <div>
                    <img
                      src={previewNF}
                      alt="Preview da NF"
                      className="max-h-44 mx-auto rounded object-contain"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {arquivoNF ? arquivoNF.name : "Imagem atual"} — clique para substituir
                    </p>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <FileImage className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Clique para fazer upload ou arraste a imagem da NF</p>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF aceitos</p>
                  </div>
                )}
              </div>
              <input
                ref={inputArquivoRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleArquivo}
              />
            </div>

            {/* Observações */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                className="text-sm resize-none"
                rows={2}
                placeholder="Observações adicionais sobre o recebimento..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || uploadando} className="gap-2">
              {salvando || uploadando ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" />{uploadando ? "Enviando NF..." : "Salvando..."}</>
              ) : (
                editando ? "Salvar Alterações" : "Cadastrar Registro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Vincular NF (MDF / Papel / Colmeia / Papelão) ─────────── */}
      <Dialog open={!!vincularReg} onOpenChange={(open) => { if (!open) { setVincularReg(null); setVincularGrupo(null); } }}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-emerald-600" />
              Vincular Nota Fiscal — {tipoVincular === "MDF" ? "MDF" : tipoMaterialPorFornecedor(vincularGrupo?.representante.fornecedor ?? null)}
            </DialogTitle>
          </DialogHeader>

          {vincularReg && (
            <>
              {/* Info da NF (somente leitura) */}
              <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1.5 text-xs">
                <p className="font-semibold text-sm mb-2">Dados da Nota Fiscal</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Nota Fiscal</span>
                    <span className="font-mono font-medium text-emerald-700">{vincularGrupo?.nota_fiscal ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium">{vincularReg.data ? fmtData(vincularReg.data) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AQs Geradas</span>
                    <span className="font-medium">{vincularGrupo?.aqs.length ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fornecedor */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Fornecedor *</Label>
                  <Select value={vincularForm.fornecedor} onValueChange={(v) => setVincularForm((f) => ({ ...f, fornecedor: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {(FORNECEDORES_POR_TIPO[tipoVincular] ?? []).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Número NF */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Número da Nota Fiscal</Label>
                  <Input className="h-8 text-sm font-mono" placeholder="NF-XXXXX" value={vincularForm.numero_nota_fiscal} onChange={(e) => setVincularForm((f) => ({ ...f, numero_nota_fiscal: e.target.value }))} />
                </div>

                {/* Operador */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Operador Responsável</Label>
                  <Input className="h-8 text-sm" placeholder="Nome do operador" value={vincularForm.operador} onChange={(e) => setVincularForm((f) => ({ ...f, operador: e.target.value }))} />
                </div>

                {/* Resumo de quantidade — condicional por tipo */}
                {tipoVincular === "MDF" ? (() => {
                  const regs = vincularGrupo?.registros ?? [];
                  const rep  = vincularGrupo?.representante;
                  const totalM3 = regs.reduce((soma, r) =>
                    soma + (r.comprimento_cm ?? 0) * (r.largura_cm ?? 0) * ((r.espessura_mm ?? 0) / 1000) * (r.qtd_conforme ?? 0), 0);
                  return (
                    <div className="col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs space-y-1.5">
                      <p className="font-semibold text-emerald-800">Volume calculado (m³)</p>
                      <div className="grid grid-cols-3 gap-x-4 text-emerald-700">
                        <div><span className="text-muted-foreground block">Comprimento (m)</span>{rep?.comprimento_cm ?? "—"}</div>
                        <div><span className="text-muted-foreground block">Largura (m)</span>{rep?.largura_cm ?? "—"}</div>
                        <div><span className="text-muted-foreground block">Espessura (mm)</span>{rep?.espessura_mm ?? "—"}</div>
                      </div>
                      <p className="text-sm font-bold text-emerald-800 pt-1 border-t border-emerald-200">
                        {totalM3.toFixed(4)} m³
                        <span className="text-xs font-normal text-emerald-700 ml-2">({regs.length} linha(s) × qtd_conforme)</span>
                      </p>
                    </div>
                  );
                })() : (
                  <div className="col-span-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs space-y-1">
                    <p className="font-semibold text-blue-800">Qtd. total (kg)</p>
                    <p className="text-sm font-bold text-blue-800">
                      {(vincularGrupo?.registros ?? []).reduce((s, r) => s + (r.qtd_conforme ?? 0), 0).toLocaleString("pt-BR")} kg
                      <span className="text-xs font-normal text-blue-700 ml-2">({(vincularGrupo?.registros ?? []).length} linha(s))</span>
                    </p>
                  </div>
                )}

                {/* Certificado FSC */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-600" />Certificado FSC</Label>
                  <Input className="h-8 text-sm font-mono" placeholder="FSC-CXXXXX" value={vincularForm.numero_certificado_fsc} onChange={(e) => setVincularForm((f) => ({ ...f, numero_certificado_fsc: e.target.value }))} />
                </div>

                {/* Validade */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Validade do Certificado</Label>
                  <Input type="date" className="h-8 text-sm" value={vincularForm.validade_certificado} onChange={(e) => setVincularForm((f) => ({ ...f, validade_certificado: e.target.value }))} />
                </div>

                {/* Upload NF */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" />Imagem da Nota Fiscal *</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    onClick={() => vincularArquivoRef.current?.click()}
                  >
                    {vincularPreview ? (
                      <div>
                        <img src={vincularPreview} alt="Preview NF" className="max-h-40 mx-auto rounded object-contain" />
                        <p className="text-xs text-muted-foreground mt-2">{vincularArquivo?.name} — clique para substituir</p>
                      </div>
                    ) : (
                      <div className="py-2 space-y-1">
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Clique para selecionar a imagem escaneada da NF</p>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF aceitos</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={vincularArquivoRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setVincularArquivo(file);
                      setVincularPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>

                {/* Observações */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea className="text-sm resize-none" rows={2} placeholder="Observações sobre este recebimento..." value={vincularForm.observacoes} onChange={(e) => setVincularForm((f) => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setVincularReg(null); setVincularGrupo(null); }}>Cancelar</Button>
            <Button onClick={vincularNFaoMaterial} disabled={vincularSalvando || !vincularArquivo} className="gap-2">
              {vincularSalvando ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Salvando...</>
              ) : (
                <><Link2 className="h-3.5 w-3.5" />Vincular NF</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: AQs Geradas ─────────────────────────────────────────────── */}
      <Dialog open={!!grupoAQsAberto} onOpenChange={() => setGrupoAQsAberto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-blue-600" />
              AQs Geradas — NF {grupoAQsAberto?.nota_fiscal ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {grupoAQsAberto && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {grupoAQsAberto.aqs.length} AQ(s) registradas para esta nota fiscal na máquina Recebimento de Chapa.
              </p>
              <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
                {grupoAQsAberto.aqs.map((aq, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-mono font-medium">{aq}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGrupoAQsAberto(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Detalhes do Lote ───────────────────────────────────────── */}
      <Dialog open={!!loteDetalheAberto} onOpenChange={() => setLoteDetalheAberto(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Detalhes do Lote — NF {loteDetalheAberto?.nota_fiscal ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {loteDetalheAberto && (() => {
            const grupo = loteDetalheAberto;
            const isMDF = loteDetalheAbertoTipo === "MDF";
            const nfVinculada = registros.find(
              (fsc) => fsc.tipo_material === loteDetalheAbertoTipo && fsc.numero_nota_fiscal === grupo.nota_fiscal && !!grupo.nota_fiscal
            );
            const totalM3 = isMDF
              ? grupo.registros.reduce((soma, r) =>
                  soma + (r.comprimento_cm ?? 0) * (r.largura_cm ?? 0) * ((r.espessura_mm ?? 0) / 1000) * (r.qtd_conforme ?? 0), 0)
              : 0;
            const totalQtd = !isMDF
              ? grupo.registros.reduce((soma, r) => soma + (r.qtd_conforme ?? 0), 0)
              : 0;

            return (
              <div className="space-y-4">
                {/* Resumo do lote */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
                    <p className="font-semibold text-sm mb-1">Informações do Lote</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nota Fiscal</span>
                      <span className="font-mono font-medium">{grupo.nota_fiscal ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium">{grupo.data ? fmtData(grupo.data) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fornecedor</span>
                      <span className="font-medium">{grupo.fornecedor ?? "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tipo de Material</span>
                      <Badge className={`${COR_TIPO[loteDetalheAbertoTipo] ?? "bg-gray-100 text-gray-700"} border-0 text-[10px]`}>{loteDetalheAbertoTipo}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registros</span>
                      <span className="font-medium">{grupo.registros.length}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
                    <p className="font-semibold text-sm mb-1">Totais</p>
                    {isMDF ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volume total</span>
                          <span className="font-bold text-emerald-700">{totalM3.toFixed(4)} m³</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AQs geradas</span>
                          <span className="font-medium">{grupo.aqs.length}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Qtd. total</span>
                        <span className="font-bold text-emerald-700">{totalQtd}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status NF</span>
                      {nfVinculada ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" />NF Vinculada
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-[10px]">
                          <Clock className="h-3 w-3" />Aguardando NF
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* AQs geradas — apenas MDF */}
                {isMDF && grupo.aqs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <ScanLine className="h-3.5 w-3.5 text-blue-600" />AQs Geradas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.aqs.map((aq, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-700 border-0 font-mono text-xs">
                          {aq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabela de registros individuais */}
                <div>
                  <p className="text-xs font-semibold mb-2">Registros de produção deste lote</p>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Lote</TableHead>
                          <TableHead className="text-xs">Produto</TableHead>
                          {isMDF ? (
                            <>
                              <TableHead className="text-xs text-right">Comp. (cm)</TableHead>
                              <TableHead className="text-xs text-right">Larg. (cm)</TableHead>
                              <TableHead className="text-xs text-right">Esp. (mm)</TableHead>
                            </>
                          ) : null}
                          <TableHead className="text-xs text-right">Qtd.</TableHead>
                          {isMDF && <TableHead className="text-xs text-right">m³</TableHead>}
                          <TableHead className="text-xs">RQ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupo.registros.map((r) => {
                          const vol = isMDF
                            ? (r.comprimento_cm ?? 0) * (r.largura_cm ?? 0) * ((r.espessura_mm ?? 0) / 1000) * (r.qtd_conforme ?? 0)
                            : 0;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-xs font-mono">{r.n_lote ?? r.lote_fornecedor ?? "—"}</TableCell>
                              <TableCell className="text-xs max-w-[8rem] truncate" title={r.produto ?? ""}>{r.produto ?? "—"}</TableCell>
                              {isMDF ? (
                                <>
                                  <TableCell className="text-xs text-right tabular-nums">{r.comprimento_cm ?? "—"}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums">{r.largura_cm ?? "—"}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums">{r.espessura_mm ?? "—"}</TableCell>
                                </>
                              ) : null}
                              <TableCell className="text-xs text-right tabular-nums">{r.qtd_conforme ?? "—"}</TableCell>
                              {isMDF && (
                                <TableCell className="text-xs text-right tabular-nums text-emerald-700 font-medium">{vol.toFixed(4)}</TableCell>
                              )}
                              <TableCell className="text-xs font-mono text-muted-foreground">{r.codigo_rq ?? "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/30 font-semibold">
                          {isMDF ? (
                            <>
                              <TableCell colSpan={6} className="text-xs text-right text-muted-foreground">Total</TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-emerald-700">{totalM3.toFixed(4)}</TableCell>
                              <TableCell />
                            </>
                          ) : (
                            <>
                              <TableCell colSpan={3} className="text-xs text-right text-muted-foreground">Total</TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-emerald-700">{totalQtd}</TableCell>
                              <TableCell />
                            </>
                          )}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLoteDetalheAberto(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Visualizar NF ────────────────────────────────────────────── */}
      <Dialog open={!!imagemDialogUrl} onOpenChange={() => setImagemDialogUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />Nota Fiscal Digitalizada
            </DialogTitle>
          </DialogHeader>
          {imagemDialogUrl && (
            <div className="space-y-3">
              <img
                src={imagemDialogUrl}
                alt="Nota Fiscal"
                className="w-full rounded-lg object-contain max-h-[65vh]"
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={imagemDialogUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />Abrir em nova aba
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog: Confirmar exclusão de NF vinculada ────────────────── */}
      <AlertDialog open={!!excluindoNFVinculada} onOpenChange={() => setExcluindoNFVinculada(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir NF vinculada?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota fiscal e seus dados serão removidos do sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                const reg = registros.find((r) => r.id === excluindoNFVinculada);
                if (excluindoNFVinculada) excluirNFVinculada(excluindoNFVinculada, reg?.imagem_nf_url ?? null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── AlertDialog: Confirmar exclusão ─────────────────────────────────── */}
      <AlertDialog open={!!excluindoId} onOpenChange={() => setExcluindoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro e a imagem de NF vinculada serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => excluindoId && excluir(excluindoId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
