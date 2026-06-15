"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users, Target, Factory, RefreshCw, UserCheck, Search, X, FileDown } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, startOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COR_VERDE = "hsl(var(--primary))";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Funcionario {
  id: number;
  matricula: string;
  nome_completo: string;
  maquina: string | null;
  setor: string | null;
  categoria: string | null;
  dias_trabalhados: string | null;
  categoria_bonus: string | null;
  valor_bonus: number | null;
  bonus_atual: number | null;
  ativo: boolean;
}

interface IndicadorProducao {
  id: number;
  mes: string;
  setor: string;
  matricula_encarregado: string | null;
  nome_encarregado: string | null;
  matricula_supervisor: string | null;
  nome_supervisor: string | null;
  meta_producao: number | null;
  producao_atual: number | null;
  producao_manual: number | null;
}

// ─── Formulários vazios ───────────────────────────────────────────────────────

const EMPTY_FUNC = {
  matricula:        "",
  nome_completo:    "",
  maquina:          "",
  setor:            "",
  categoria:        "",
  dias_trabalhados: "",
  categoria_bonus:  "",
  valor_bonus:      "",
  bonus_atual:      "",
  ativo:            "true" as "true" | "false",
};

const EMPTY_IND = {
  setor:                 "",
  matricula_encarregado: "",
  nome_encarregado:      "",
  matricula_supervisor:  "",
  nome_supervisor:       "",
  meta_producao:         "",
  producao_manual:       "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, dec = 2) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtMes(isoDate: string) {
  return format(parseISO(isoDate), "MM/yyyy", { locale: ptBR });
}

function pct(real: number | null, meta: number | null): string {
  if (!real || !meta || meta === 0) return "—";
  return (real / meta * 100).toFixed(1) + "%";
}

function gerarOpcoesMes(): { label: string; value: string }[] {
  const hoje = new Date();
  const opcoes: { label: string; value: string }[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = startOfMonth(i < 0 ? subMonths(hoje, -i) : addMonths(hoje, i));
    opcoes.push({
      label: format(d, "MMMM/yyyy", { locale: ptBR }),
      value: format(d, "yyyy-MM-dd"),
    });
  }
  return opcoes.reverse();
}

const OPCOES_MES = gerarOpcoesMes();
const MES_ATUAL  = format(startOfMonth(new Date()), "yyyy-MM-dd");

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MetasPage() {
  const [aba, setAba] = useState<"funcionarios" | "metas">("funcionarios");

  // ── Funcionários ──
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loadingFunc, setLoadingFunc]   = useState(false);
  const [funcDialog, setFuncDialog]     = useState(false);
  const [funcEditId, setFuncEditId]     = useState<number | null>(null);
  const [funcForm, setFuncForm]         = useState(EMPTY_FUNC);
  const [savingFunc, setSavingFunc]     = useState(false);

  // ── Filtros da aba Funcionários ──
  const [busca, setBusca]                     = useState("");
  const [filtroMaquina, setFiltroMaquina]     = useState("todos");
  const [filtroFuncao, setFiltroFuncao]       = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // ── Indicadores ──
  const [indicadores, setIndicadores] = useState<IndicadorProducao[]>([]);
  const [loadingInd, setLoadingInd]   = useState(false);
  const [indDialog, setIndDialog]     = useState(false);
  const [indEditId, setIndEditId]     = useState<number | null>(null);
  const [indForm, setIndForm]         = useState(EMPTY_IND);
  const [indMes, setIndMes]           = useState(MES_ATUAL);
  const [savingInd, setSavingInd]     = useState(false);

  // ── Bulk metas ──
  const [bulkDialog, setBulkDialog]   = useState(false);
  const [bulkSetores, setBulkSetores] = useState<string[]>([]);
  const [bulkMetas, setBulkMetas]     = useState<Record<string, { meta: string; producao: string }>>({});
  const [savingBulk, setSavingBulk]   = useState(false);
  const [novoSetor, setNovoSetor]     = useState("");

  // ── Sync ──
  const [sincronizando, setSincronizando]       = useState(false);
  const [preenchendoResp, setPreenchendoResp]   = useState(false);

  // ── Mapeamento setor → máquinas ──
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<string[]>([]);
  const [indMaquinas, setIndMaquinas]                 = useState<string[]>([]);

  // ─── Fetch Funcionários ───────────────────────────────────────────────────

  const fetchFuncionarios = useCallback(async () => {
    setLoadingFunc(true);
    const { data, error } = await supabase
      .from("base_funcionarios")
      .select("*")
      .order("nome_completo");
    if (error) toast.error("Erro ao carregar funcionários: " + error.message);
    else setFuncionarios(data ?? []);
    setLoadingFunc(false);
  }, []);

  useEffect(() => { fetchFuncionarios(); }, [fetchFuncionarios]);

  // Carrega máquinas disponíveis (paginado para buscar todas as distintas)
  useEffect(() => {
    (async () => {
      const TAM = 1000;
      let pagina = 0;
      const nomes = new Set<string>();
      while (true) {
        const { data } = await supabase
          .from("registros_producao")
          .select("maquina")
          .range(pagina * TAM, (pagina + 1) * TAM - 1);
        if (!data || data.length === 0) break;
        data.forEach(r => nomes.add(r.maquina));
        if (data.length < TAM) break;
        pagina++;
      }
      setMaquinasDisponiveis(Array.from(nomes).sort());
    })();
  }, []);


  // ─── Fetch Indicadores (range de mês) ────────────────────────────────────

  const fetchIndicadores = useCallback(async () => {
    setLoadingInd(true);
    const mesFim = format(addMonths(parseISO(indMes), 1), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("indicadores_producao")
      .select("*")
      .gte("mes", indMes)
      .lt("mes", mesFim)
      .order("setor");
    if (error) toast.error("Erro ao carregar metas: " + error.message);
    else setIndicadores(data ?? []);
    setLoadingInd(false);
  }, [indMes]);

  // ─── Sincronização automática: soma registros_producao por setor ──────────

  const sincronizarProducao = useCallback(async (inds: IndicadorProducao[]) => {
    if (inds.length === 0) return;
    setSincronizando(true);

    // 1. Busca mapeamento setor → máquinas
    const setores = inds.map(i => i.setor);
    const { data: mappings } = await supabase
      .from("setor_maquina_map")
      .select("setor, maquina")
      .in("setor", setores);

    if (!mappings || mappings.length === 0) {
      setSincronizando(false);
      toast.error("Nenhum mapeamento encontrado. Vincule as máquinas nos setores primeiro.");
      return;
    }

    // 2. Agrupa: { setor: [maquina1, maquina2, ...] }
    const setorMaquinas: Record<string, string[]> = {};
    for (const m of mappings) {
      if (!setorMaquinas[m.setor]) setorMaquinas[m.setor] = [];
      setorMaquinas[m.setor].push(m.maquina);
    }

    // 3. Busca registros do mês para todas as máquinas mapeadas (paginado)
    const todasMaquinas = mappings.map(m => m.maquina);
    const mesFim = format(addMonths(parseISO(indMes), 1), "yyyy-MM-dd");
    const TAM = 1000;
    let pagina = 0;
    const registros: { maquina: string; qtd_conforme: number | null }[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina, qtd_conforme")
        .gte("data", indMes)
        .lt("data", mesFim)
        .in("maquina", todasMaquinas)
        .range(pagina * TAM, (pagina + 1) * TAM - 1);
      if (error) { setSincronizando(false); return; }
      if (!data || data.length === 0) break;
      registros.push(...data);
      if (data.length < TAM) break;
      pagina++;
    }

    // 4. Soma por máquina
    const totais: Record<string, number> = {};
    for (const r of registros ?? []) {
      totais[r.maquina] = (totais[r.maquina] ?? 0) + (r.qtd_conforme ?? 0);
    }

    // 5. Soma por setor (todas as máquinas do setor)
    const updates = inds
      .filter(ind => setorMaquinas[ind.setor])
      .map(ind => {
        const soma = (setorMaquinas[ind.setor] ?? [])
          .reduce((acc, maq) => acc + (totais[maq] ?? 0), 0);
        const manual = ind.producao_manual ?? 0;
        return supabase
          .from("indicadores_producao")
          .update({ producao_atual: soma + manual })
          .eq("id", ind.id);
      });

    await Promise.all(updates);
    setSincronizando(false);
    await fetchIndicadores();
    toast.success("Produção sincronizada.");
  }, [indMes, fetchIndicadores]);

  useEffect(() => {
    if (aba !== "metas") return;
    fetchIndicadores().then(() => {
      // Auto-sync após carregar (sem toast para não poluir)
      supabase
        .from("indicadores_producao")
        .select("*")
        .gte("mes", indMes)
        .lt("mes", format(addMonths(parseISO(indMes), 1), "yyyy-MM-dd"))
        .order("setor")
        .then(({ data }) => {
          if (data) sincronizarProducao(data as IndicadorProducao[]);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, fetchIndicadores]);

  // ─── Handlers Funcionários ────────────────────────────────────────────────

  function openFuncAdd() {
    setFuncEditId(null); setFuncForm(EMPTY_FUNC); setFuncDialog(true);
  }

  function openFuncEdit(f: Funcionario) {
    setFuncEditId(f.id);
    setFuncForm({
      matricula:        f.matricula,
      nome_completo:    f.nome_completo,
      maquina:          f.maquina ?? "",
      setor:            f.setor ?? "",
      categoria:        f.categoria ?? "",
      dias_trabalhados: f.dias_trabalhados ?? "",
      categoria_bonus:  f.categoria_bonus ?? "",
      valor_bonus:      f.valor_bonus !== null ? String(f.valor_bonus) : "",
      bonus_atual:      f.bonus_atual !== null ? String(f.bonus_atual) : "",
      ativo:            f.ativo ? "true" : "false",
    });
    setFuncDialog(true);
  }

  async function handleFuncDelete(id: number) {
    const { error } = await supabase.from("base_funcionarios").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Funcionário removido."); fetchFuncionarios();
  }

  async function handleFuncSave() {
    if (!funcForm.matricula.trim() || !funcForm.nome_completo.trim()) {
      toast.error("Preencha Matrícula e Nome."); return;
    }
    setSavingFunc(true);
    const payload = {
      matricula:        funcForm.matricula.trim(),
      nome_completo:    funcForm.nome_completo.trim(),
      maquina:          funcForm.maquina.trim() || null,
      setor:            funcForm.setor.trim() || null,
      categoria:        funcForm.categoria.trim() || null,
      dias_trabalhados: funcForm.dias_trabalhados.trim() || null,
      categoria_bonus:  funcForm.categoria_bonus.trim() || null,
      valor_bonus:      funcForm.valor_bonus !== "" ? Number(funcForm.valor_bonus) : null,
      bonus_atual:      funcForm.bonus_atual !== "" ? Number(funcForm.bonus_atual) : null,
      ativo:            funcForm.ativo === "true",
    };
    const { error } = funcEditId !== null
      ? await supabase.from("base_funcionarios").update(payload).eq("id", funcEditId)
      : await supabase.from("base_funcionarios").insert(payload);
    setSavingFunc(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(funcEditId !== null ? "Funcionário atualizado." : "Funcionário cadastrado.");
    setFuncDialog(false); setFuncForm(EMPTY_FUNC); setFuncEditId(null); fetchFuncionarios();
  }

  // ─── Preencher responsáveis pelo histórico ────────────────────────────────

  const preencherResponsaveis = useCallback(async () => {
    setPreenchendoResp(true);

    // Busca todos os registros da tabela, de qualquer mês
    const { data: todos } = await supabase
      .from("indicadores_producao")
      .select("id, setor, matricula_encarregado, nome_encarregado, matricula_supervisor, nome_supervisor, mes")
      .order("mes", { ascending: false });

    if (!todos || todos.length === 0) {
      setPreenchendoResp(false);
      toast.info("Nenhum registro encontrado.");
      return;
    }

    // Para cada setor, determina o responsável canônico (registro mais recente com dados)
    const canonico: Record<string, {
      matricula_encarregado: string | null; nome_encarregado: string | null;
      matricula_supervisor:  string | null; nome_supervisor:  string | null;
    }> = {};
    for (const row of todos) {
      if (!canonico[row.setor]) {
        canonico[row.setor] = {
          matricula_encarregado: null, nome_encarregado: null,
          matricula_supervisor:  null, nome_supervisor:  null,
        };
      }
      const c = canonico[row.setor];
      if (!c.matricula_encarregado && row.matricula_encarregado) {
        c.matricula_encarregado = row.matricula_encarregado;
        c.nome_encarregado      = row.nome_encarregado;
      }
      if (!c.matricula_supervisor && row.matricula_supervisor) {
        c.matricula_supervisor = row.matricula_supervisor;
        c.nome_supervisor      = row.nome_supervisor;
      }
    }

    // Atualiza todos os registros que estão incompletos
    const semResp = todos.filter(
      r => !r.matricula_encarregado || !r.matricula_supervisor
    );

    let atualizados = 0;
    for (const row of semResp) {
      const c = canonico[row.setor];
      if (!c) continue;
      const patch: Record<string, string | null> = {};
      if (!row.matricula_encarregado && c.matricula_encarregado) {
        patch.matricula_encarregado = c.matricula_encarregado;
        patch.nome_encarregado      = c.nome_encarregado;
      }
      if (!row.matricula_supervisor && c.matricula_supervisor) {
        patch.matricula_supervisor = c.matricula_supervisor;
        patch.nome_supervisor      = c.nome_supervisor;
      }
      if (Object.keys(patch).length === 0) continue;
      const { error } = await supabase
        .from("indicadores_producao")
        .update(patch)
        .eq("id", row.id);
      if (!error) atualizados++;
    }

    setPreenchendoResp(false);
    if (atualizados > 0) {
      toast.success(`${atualizados} registro(s) preenchidos com responsáveis.`);
      fetchIndicadores();
    } else {
      toast.info("Todos os registros já têm responsáveis, ou nenhum histórico encontrado.");
    }
  }, [fetchIndicadores]);

  // ─── Handlers Indicadores ─────────────────────────────────────────────────

  async function openBulkAdd() {
    // Carrega todos os setores já cadastrados em qualquer mês
    const { data } = await supabase
      .from("indicadores_producao")
      .select("setor")
      .order("setor");
    const setores = Array.from(new Set(data?.map(r => r.setor) ?? [])).sort() as string[];
    setBulkSetores(setores);

    // Pré-preenche com valores do mês atual se existirem
    const init: Record<string, { meta: string; producao: string }> = {};
    for (const s of setores) {
      const ind = indicadores.find(i => i.setor === s);
      init[s] = {
        meta:     ind?.meta_producao    != null ? String(ind.meta_producao)    : "",
        producao: ind?.producao_atual   != null ? String(ind.producao_atual)   : "",
      };
    }
    setBulkMetas(init);
    setNovoSetor("");
    setBulkDialog(true);
  }

  function addBulkSetor() {
    const s = novoSetor.trim();
    if (!s || bulkSetores.includes(s)) return;
    setBulkSetores(prev => [...prev, s].sort());
    setBulkMetas(prev => ({ ...prev, [s]: { meta: "", producao: "" } }));
    setNovoSetor("");
  }

  async function handleBulkSave() {
    const linhas = bulkSetores.filter(s => bulkMetas[s]?.meta !== "" || bulkMetas[s]?.producao !== "");
    if (linhas.length === 0) { toast.error("Nenhum valor preenchido."); return; }
    setSavingBulk(true);

    // Busca responsáveis históricos para setores sem dados no mês atual
    const setoresSemResp = linhas.filter(s => {
      const ind = indicadores.find(i => i.setor === s);
      return !ind?.matricula_encarregado || !ind?.matricula_supervisor;
    });
    const respHistorico: Record<string, {
      matricula_encarregado: string | null; nome_encarregado: string | null;
      matricula_supervisor: string | null;  nome_supervisor: string | null;
    }> = {};
    if (setoresSemResp.length > 0) {
      const { data: hist } = await supabase
        .from("indicadores_producao")
        .select("setor, matricula_encarregado, nome_encarregado, matricula_supervisor, nome_supervisor")
        .in("setor", setoresSemResp)
        .lt("mes", indMes)
        .order("mes", { ascending: false });
      for (const row of hist ?? []) {
        if (!respHistorico[row.setor]) {
          respHistorico[row.setor] = {
            matricula_encarregado: row.matricula_encarregado,
            nome_encarregado:      row.nome_encarregado,
            matricula_supervisor:  row.matricula_supervisor,
            nome_supervisor:       row.nome_supervisor,
          };
        }
      }
    }

    let erros = 0;
    for (const setor of linhas) {
      const ind  = indicadores.find(i => i.setor === setor);
      const hist = respHistorico[setor];
      const payload = {
        mes:           indMes,
        setor,
        meta_producao:  bulkMetas[setor].meta     !== "" ? Number(bulkMetas[setor].meta)     : null,
        producao_atual: bulkMetas[setor].producao !== "" ? Number(bulkMetas[setor].producao) : null,
        matricula_encarregado: ind?.matricula_encarregado ?? hist?.matricula_encarregado ?? null,
        nome_encarregado:      ind?.nome_encarregado      ?? hist?.nome_encarregado      ?? null,
        matricula_supervisor:  ind?.matricula_supervisor  ?? hist?.matricula_supervisor  ?? null,
        nome_supervisor:       ind?.nome_supervisor       ?? hist?.nome_supervisor       ?? null,
      };
      const { error } = await supabase
        .from("indicadores_producao")
        .upsert(payload, { onConflict: "setor,mes" });
      if (error) erros++;
    }
    setSavingBulk(false);
    if (erros > 0) toast.error(`${erros} erro(s) ao salvar.`);
    else toast.success(`${linhas.length} metas salvas com sucesso.`);
    setBulkDialog(false);
    fetchIndicadores();
  }

  async function openIndEdit(ind: IndicadorProducao) {
    setIndEditId(ind.id);
    setIndForm({
      setor:                 ind.setor,
      matricula_encarregado: ind.matricula_encarregado ?? "",
      nome_encarregado:      ind.nome_encarregado ?? "",
      matricula_supervisor:  ind.matricula_supervisor ?? "",
      nome_supervisor:       ind.nome_supervisor ?? "",
      meta_producao:         ind.meta_producao !== null ? String(ind.meta_producao) : "",
      producao_manual:       ind.producao_manual !== null && ind.producao_manual !== undefined ? String(ind.producao_manual) : "",
    });
    // Carrega máquinas já vinculadas a este setor
    const { data } = await supabase
      .from("setor_maquina_map")
      .select("maquina")
      .eq("setor", ind.setor);
    setIndMaquinas(data?.map(r => r.maquina) ?? []);
    setIndDialog(true);
  }

  async function handleIndDelete(id: number) {
    const { error } = await supabase.from("indicadores_producao").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Meta removida."); fetchIndicadores();
  }

  async function handleIndSave() {
    if (!indForm.setor.trim()) { toast.error("Informe o setor."); return; }
    setSavingInd(true);

    // Resolve nomes a partir da matrícula se o usuário selecionou da lista
    const enc = funcionarios.find(f => f.matricula === indForm.matricula_encarregado);
    const sup = funcionarios.find(f => f.matricula === indForm.matricula_supervisor);

    const producaoManual = indForm.producao_manual !== "" ? Number(indForm.producao_manual) : 0;

    // Usa data do primeiro dia do mês selecionado
    const payload = {
      setor:                 indForm.setor.trim(),
      mes:                   indMes,
      matricula_encarregado: indForm.matricula_encarregado || null,
      nome_encarregado:      enc?.nome_completo ?? (indForm.nome_encarregado || null),
      matricula_supervisor:  indForm.matricula_supervisor || null,
      nome_supervisor:       sup?.nome_completo ?? (indForm.nome_supervisor || null),
      meta_producao:         indForm.meta_producao !== "" ? Number(indForm.meta_producao) : null,
      producao_manual:       producaoManual,
    };
    const { error } = indEditId !== null
      ? await supabase.from("indicadores_producao").update(payload).eq("id", indEditId)
      : await supabase.from("indicadores_producao").insert(payload);
    if (error) { setSavingInd(false); toast.error("Erro ao salvar: " + error.message); return; }

    // Propaga encarregado/supervisor para todos os outros meses do mesmo setor
    const patchGlobal: Record<string, string | null> = {
      matricula_encarregado: payload.matricula_encarregado,
      nome_encarregado:      payload.nome_encarregado,
      matricula_supervisor:  payload.matricula_supervisor,
      nome_supervisor:       payload.nome_supervisor,
    };
    await supabase
      .from("indicadores_producao")
      .update(patchGlobal)
      .eq("setor", payload.setor)
      .neq("mes", indMes);

    // Salva mapeamento setor → máquinas
    await supabase.from("setor_maquina_map").delete().eq("setor", indForm.setor);
    if (indMaquinas.length > 0) {
      await supabase.from("setor_maquina_map").insert(
        indMaquinas.map(maquina => ({ setor: indForm.setor, maquina }))
      );
    } else {
      // Sem máquinas com app: produção = apenas o valor manual
      await supabase
        .from("indicadores_producao")
        .update({ producao_atual: producaoManual })
        .eq("setor", indForm.setor)
        .eq("mes", indMes);
    }

    setSavingInd(false);
    toast.success(indEditId !== null ? "Meta atualizada." : "Meta registrada.");
    setIndDialog(false); setIndForm(EMPTY_IND); setIndEditId(null);

    // Se há máquinas, re-sincroniza para refletir a nova seleção imediatamente
    if (indMaquinas.length > 0) {
      const { data: indsAtuais } = await supabase
        .from("indicadores_producao")
        .select("*")
        .gte("mes", indMes)
        .lt("mes", format(addMonths(parseISO(indMes), 1), "yyyy-MM-dd"))
        .order("setor");
      if (indsAtuais) sincronizarProducao(indsAtuais as IndicadorProducao[]);
      else fetchIndicadores();
    } else {
      fetchIndicadores();
    }
  }

  // ─── Opções de filtro (derivadas do array carregado) ─────────────────────

  const opcoesMaquina = useMemo(() =>
    [...new Set(funcionarios.map(f => f.maquina).filter(Boolean) as string[])].sort(),
    [funcionarios]);

  const opcoesFuncao = useMemo(() =>
    [...new Set(funcionarios.map(f => f.setor).filter(Boolean) as string[])].sort(),
    [funcionarios]);

  const opcoesCategoria = useMemo(() =>
    [...new Set(funcionarios.map(f => f.categoria).filter(Boolean) as string[])].sort(),
    [funcionarios]);

  const funcionariosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return funcionarios.filter(f => {
      if (q && !f.nome_completo.toLowerCase().includes(q) && !f.matricula.toLowerCase().includes(q)) return false;
      if (filtroMaquina   !== "todos" && f.maquina   !== filtroMaquina)   return false;
      if (filtroFuncao    !== "todos" && f.setor      !== filtroFuncao)    return false;
      if (filtroCategoria !== "todos" && f.categoria  !== filtroCategoria) return false;
      return true;
    });
  }, [funcionarios, busca, filtroMaquina, filtroFuncao, filtroCategoria]);

  const filtrosAtivos = busca !== "" || filtroMaquina !== "todos" || filtroFuncao !== "todos" || filtroCategoria !== "todos";

  function limparFiltros() {
    setBusca(""); setFiltroMaquina("todos"); setFiltroFuncao("todos"); setFiltroCategoria("todos");
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  const totalAtivos       = funcionarios.filter(f => f.ativo).length;
  const totalSetoresMeta  = indicadores.length;
  const somaMetas         = indicadores.reduce((s, i) => s + (i.meta_producao ?? 0), 0);

  // ─── PDF ──────────────────────────────────────────────────────────────────

  function gerarPDF() {
    const mesFormatado = fmtMes(indMes);
    const logoUrl = window.location.origin + "/leaf-concrem.png";
    const linhas = indicadores.map(ind => {
      const realPct = ind.meta_producao && ind.producao_atual
        ? ind.producao_atual / ind.meta_producao * 100 : null;
      const cor = realPct === null ? "#6b7280"
        : realPct >= 100 ? "#16a34a"
        : realPct >= 80  ? "#d97706"
        : "#dc2626";
      const pctStr = realPct === null ? "—" : realPct.toFixed(1) + "%";
      const enc = ind.nome_encarregado
        ? `${ind.nome_encarregado} (${ind.matricula_encarregado})`  : "—";
      const sup = ind.nome_supervisor
        ? `${ind.nome_supervisor} (${ind.matricula_supervisor})` : "—";
      const metaFmt = ind.meta_producao?.toLocaleString("pt-BR") ?? "—";
      const prodFmt = ind.producao_atual?.toLocaleString("pt-BR") ?? "—";
      return `<tr>
        <td>${ind.setor}</td>
        <td>${enc}</td>
        <td>${sup}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${metaFmt}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${prodFmt}</td>
        <td style="text-align:right;color:${cor};font-weight:700">${pctStr}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Metas de Produção — ${mesFormatado}</title>
<style>
  @page { size: A4 landscape; margin: 1.5cm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #111; font-size: 10px; }
  .header { display:flex; align-items:center; gap:16px; margin-bottom:18px;
            padding-bottom:12px; border-bottom:2px solid #216C3B; }
  .header img { height:38px; }
  .header h1 { font-size:16px; color:#216C3B; font-weight:700; }
  .header p  { font-size:11px; color:#555; margin-top:2px; }
  .kpis { display:flex; gap:18px; margin-bottom:16px; }
  .kpi { padding:8px 14px; border:1px solid #d1d5db; border-radius:6px; }
  .kpi-label { font-size:9px; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; }
  .kpi-value { font-size:15px; font-weight:700; color:#216C3B; }
  table { width:100%; border-collapse:collapse; }
  th { background:#216C3B; color:#fff; padding:7px 8px; text-align:left;
       font-size:9px; text-transform:uppercase; letter-spacing:.05em; }
  th:nth-child(n+4), td:nth-child(n+4) { text-align:right; }
  td { padding:6px 8px; border-bottom:1px solid #e5e7eb; font-size:9.5px; }
  tr:nth-child(even) td { background:#f9fafb; }
  .footer { margin-top:14px; font-size:9px; color:#9ca3af; text-align:right; }
</style></head><body>
<div class="header">
  <img src="${logoUrl}" alt="Concrem" />
  <div><h1>Metas de Produção</h1>
    <p>Período: ${mesFormatado} &nbsp;·&nbsp; ${indicadores.length} setor(es)</p></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Soma das Metas</div>
    <div class="kpi-value">${somaMetas.toLocaleString("pt-BR")}</div></div>
  <div class="kpi"><div class="kpi-label">Setores ≥ 100%</div>
    <div class="kpi-value">${indicadores.filter(i => i.meta_producao && i.producao_atual && i.producao_atual / i.meta_producao >= 1).length}</div></div>
</div>
<table>
  <thead><tr><th>Setor</th><th>Encarregado</th><th>Supervisor</th>
    <th>Meta</th><th>Produção Atual</th><th>% Real</th></tr></thead>
  <tbody>${linhas}</tbody>
</table>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Permita pop-ups para gerar o PDF."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Título */}
      <div className="border-b pb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Produção</p>
        <h1 className="text-xl font-bold" style={{ color: COR_VERDE }}>Metas de Produção</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(33,108,59,0.1)" }}>
              <Users className="h-5 w-5" style={{ color: COR_VERDE }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
              <p className="text-2xl font-bold" style={{ color: COR_VERDE }}>{totalAtivos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(33,108,59,0.1)" }}>
              <Factory className="h-5 w-5" style={{ color: COR_VERDE }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Setores com Meta ({fmtMes(indMes)})</p>
              <p className="text-2xl font-bold" style={{ color: COR_VERDE }}>{totalSetoresMeta}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border" style={{ borderColor: "rgba(33,108,59,0.2)" }}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(33,108,59,0.1)" }}>
              <Target className="h-5 w-5" style={{ color: COR_VERDE }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Soma das Metas ({fmtMes(indMes)})</p>
              <p className="text-2xl font-bold" style={{ color: COR_VERDE }}>{fmt(somaMetas, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seletor de aba */}
      <div className="flex gap-1 border-b">
        {([
          { id: "funcionarios", label: "Funcionários" },
          { id: "metas",        label: "Metas de Produção" },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setAba(id)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              aba === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* ════ ABA FUNCIONÁRIOS ════ */}
      {aba === "funcionarios" && (
        <Card>
          <CardContent className="p-4 space-y-3">

            {/* ── Barra de busca + filtros ── */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Campo de busca */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou matrícula…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {busca && (
                  <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filtro Máquina/Setor */}
              <Select value={filtroMaquina} onValueChange={setFiltroMaquina}>
                <SelectTrigger className={cn("h-8 text-xs w-44", filtroMaquina !== "todos" && "border-primary text-primary")}>
                  <SelectValue placeholder="Máquina / Setor" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="todos" className="text-xs">Máquina / Setor</SelectItem>
                  {opcoesMaquina.map(v => (
                    <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Função */}
              <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
                <SelectTrigger className={cn("h-8 text-xs w-40", filtroFuncao !== "todos" && "border-primary text-primary")}>
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="todos" className="text-xs">Função</SelectItem>
                  {opcoesFuncao.map(v => (
                    <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Categoria */}
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className={cn("h-8 text-xs w-36", filtroCategoria !== "todos" && "border-primary text-primary")}>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="todos" className="text-xs">Categoria</SelectItem>
                  {opcoesCategoria.map(v => (
                    <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Limpar filtros */}
              {filtrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}

              {/* Botão adicionar — empurrado para a direita */}
              <div className="ml-auto">
                <Button size="sm" onClick={openFuncAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar Funcionário
                </Button>
              </div>
            </div>

            {/* Contagem de resultados */}
            {filtrosAtivos && !loadingFunc && (
              <p className="text-xs text-muted-foreground">
                {funcionariosFiltrados.length} de {funcionarios.length} funcionário{funcionarios.length !== 1 ? "s" : ""}
              </p>
            )}

            {loadingFunc ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : funcionarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum funcionário cadastrado.</p>
            ) : funcionariosFiltrados.length === 0 ? (
              <div className="text-center py-8 space-y-1">
                <p className="text-sm text-muted-foreground">Nenhum resultado para os filtros aplicados.</p>
                <button onClick={limparFiltros} className="text-xs text-primary hover:underline">Limpar filtros</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Máquina / Setor</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Dias Trab.</TableHead>
                      <TableHead>Cat. Bônus</TableHead>
                      <TableHead className="text-right">Valor Bônus</TableHead>
                      <TableHead className="text-right">Bônus Atual</TableHead>
                      <TableHead className="text-right">DIF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionariosFiltrados.map((f) => {
                      const dif = (f.valor_bonus ?? 0) - (f.bonus_atual ?? 0);
                      const temBonus = f.valor_bonus !== null || f.bonus_atual !== null;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs font-mono font-medium">{f.matricula}</TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap">{f.nome_completo}</TableCell>
                          <TableCell className="text-xs">{f.maquina || "—"}</TableCell>
                          <TableCell className="text-xs">{f.setor || "—"}</TableCell>
                          <TableCell className="text-xs">{f.categoria || "—"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{f.dias_trabalhados || "—"}</TableCell>
                          <TableCell className="text-xs">{f.categoria_bonus || "—"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmt(f.valor_bonus)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmt(f.bonus_atual)}</TableCell>
                          <TableCell className={cn("text-xs text-right tabular-nums font-semibold",
                            temBonus ? dif >= 0 ? "text-emerald-600" : "text-red-600" : "text-muted-foreground")}>
                            {temBonus ? fmt(dif) : "—"}
                          </TableCell>
                          <TableCell>
                            {f.ativo
                              ? <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50">Ativo</Badge>
                              : <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFuncEdit(f)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleFuncDelete(f.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════ ABA METAS DE PRODUÇÃO ════ */}
      {aba === "metas" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Select value={indMes} onValueChange={setIndMes}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {OPCOES_MES.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5"
                  disabled={preenchendoResp}
                  onClick={() => preencherResponsaveis()}>
                  <UserCheck className={cn("h-4 w-4", preenchendoResp && "animate-spin")} />
                  {preenchendoResp ? "Preenchendo..." : "Responsáveis"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  disabled={sincronizando}
                  onClick={() => sincronizarProducao(indicadores)}>
                  <RefreshCw className={cn("h-4 w-4", sincronizando && "animate-spin")} />
                  {sincronizando ? "Sincronizando..." : "Sincronizar"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={gerarPDF} disabled={indicadores.length === 0}>
                  <FileDown className="h-4 w-4" /> Baixar PDF
                </Button>
                <Button size="sm" onClick={openBulkAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Meta
                </Button>
              </div>
            </div>

            {loadingInd ? (
              <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
            ) : indicadores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma meta registrada para {fmtMes(indMes)}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor</TableHead>
                      <TableHead>Encarregado</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead className="text-right">Meta</TableHead>
                      <TableHead className="text-right">Produção Atual</TableHead>
                      <TableHead className="text-right">% Real</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicadores.map((ind) => {
                      const realPct = ind.meta_producao && ind.producao_atual
                        ? ind.producao_atual / ind.meta_producao * 100 : null;
                      return (
                        <TableRow key={ind.id}>
                          <TableCell className="text-xs font-medium">{ind.setor}</TableCell>
                          <TableCell className="text-xs">
                            {ind.nome_encarregado
                              ? <span>{ind.nome_encarregado} <span className="text-muted-foreground font-mono">({ind.matricula_encarregado})</span></span>
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ind.nome_supervisor
                              ? <span>{ind.nome_supervisor} <span className="text-muted-foreground font-mono">({ind.matricula_supervisor})</span></span>
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{fmt(ind.meta_producao, 0)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span>{fmt(ind.producao_atual, 0)}</span>
                            {(ind.producao_manual ?? 0) > 0 && (
                              <span className="ml-1 text-[10px] text-amber-600 font-medium" title={`Inclui ${fmt(ind.producao_manual, 0)} pç manual`}>
                                +{fmt(ind.producao_manual, 0)}M
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-xs text-right tabular-nums font-semibold",
                            realPct === null ? "text-muted-foreground"
                              : realPct >= 100 ? "text-emerald-600"
                              : realPct >= 80  ? "text-yellow-600"
                              : "text-red-600")}>
                            {pct(ind.producao_atual, ind.meta_producao)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openIndEdit(ind)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════ DIALOG FUNCIONÁRIO ════ */}
      <Dialog open={funcDialog} onOpenChange={setFuncDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{funcEditId !== null ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-mat">Matrícula *</Label>
                <Input id="func-mat" placeholder="Ex: 00123" value={funcForm.matricula}
                  onChange={(e) => setFuncForm({ ...funcForm, matricula: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="func-nome">Nome Completo *</Label>
                <Input id="func-nome" placeholder="Nome do funcionário" value={funcForm.nome_completo}
                  onChange={(e) => setFuncForm({ ...funcForm, nome_completo: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-maq">Máquina / Setor</Label>
                <Input id="func-maq" placeholder="Ex: Coladeira de Alizar 1" value={funcForm.maquina}
                  onChange={(e) => setFuncForm({ ...funcForm, maquina: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="func-setor">Função</Label>
                <Input id="func-setor" placeholder="Ex: Operador de Máquina" value={funcForm.setor}
                  onChange={(e) => setFuncForm({ ...funcForm, setor: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-cat">Categoria</Label>
                <Input id="func-cat" placeholder="Ex: AUXILIAR" value={funcForm.categoria}
                  onChange={(e) => setFuncForm({ ...funcForm, categoria: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="func-dias">Dias Trabalhados</Label>
                <Input id="func-dias" placeholder="Ex: 30 ou 10-férias" value={funcForm.dias_trabalhados}
                  onChange={(e) => setFuncForm({ ...funcForm, dias_trabalhados: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-catbon">Categoria Bônus</Label>
                <Input id="func-catbon" placeholder="Ex: A" value={funcForm.categoria_bonus}
                  onChange={(e) => setFuncForm({ ...funcForm, categoria_bonus: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="func-valbon">Valor Bônus (R$)</Label>
                <Input id="func-valbon" type="number" min="0" step="0.01" placeholder="0,00" value={funcForm.valor_bonus}
                  onChange={(e) => setFuncForm({ ...funcForm, valor_bonus: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-bonatu">Bônus Atual (R$)</Label>
                <Input id="func-bonatu" type="number" min="0" step="0.01" placeholder="0,00" value={funcForm.bonus_atual}
                  onChange={(e) => setFuncForm({ ...funcForm, bonus_atual: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={funcForm.ativo} onValueChange={(v: "true" | "false") => setFuncForm({ ...funcForm, ativo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(funcForm.valor_bonus !== "" || funcForm.bonus_atual !== "") && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">DIF (Valor Bônus − Bônus Atual)</span>
                <span className={cn("font-semibold tabular-nums",
                  ((Number(funcForm.valor_bonus) || 0) - (Number(funcForm.bonus_atual) || 0)) >= 0
                    ? "text-emerald-600" : "text-red-600")}>
                  {fmt((Number(funcForm.valor_bonus) || 0) - (Number(funcForm.bonus_atual) || 0))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleFuncSave} disabled={savingFunc}>
              {savingFunc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {funcEditId !== null ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOG BULK METAS ════ */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Metas de Produção — {fmtMes(indMes)}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-auto">Setor</TableHead>
                  <TableHead className="w-36 text-right">Meta</TableHead>
                  <TableHead className="w-36 text-right">Produção Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkSetores.map(setor => (
                  <TableRow key={setor}>
                    <TableCell className="text-sm font-medium py-1.5">{setor}</TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        type="number" min="0" step="1" placeholder="—"
                        className="h-7 text-right tabular-nums text-sm"
                        value={bulkMetas[setor]?.meta ?? ""}
                        onChange={e => setBulkMetas(prev => ({ ...prev, [setor]: { ...prev[setor], meta: e.target.value } }))}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        type="number" min="0" step="1" placeholder="—"
                        className="h-7 text-right tabular-nums text-sm"
                        value={bulkMetas[setor]?.producao ?? ""}
                        onChange={e => setBulkMetas(prev => ({ ...prev, [setor]: { ...prev[setor], producao: e.target.value } }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha para adicionar novo setor */}
                <TableRow>
                  <TableCell colSpan={3} className="pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="+ Adicionar setor..."
                        className="h-7 text-sm"
                        value={novoSetor}
                        onChange={e => setNovoSetor(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBulkSetor(); } }}
                      />
                      <Button size="sm" variant="outline" className="h-7 px-3 shrink-0" onClick={addBulkSetor}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-2 border-t mt-2">
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleBulkSave} disabled={savingBulk}>
              {savingBulk && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOG EDIÇÃO INDIVIDUAL ════ */}
      <Dialog open={indDialog} onOpenChange={setIndDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Meta — {indForm.setor}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Encarregado</Label>
                <Select value={indForm.matricula_encarregado || "__none__"}
                  onValueChange={(v) => setIndForm({ ...indForm, matricula_encarregado: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {funcionarios.filter(f => f.ativo).map(f => (
                      <SelectItem key={f.matricula + f.id} value={f.matricula}>
                        {f.matricula} — {f.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supervisor</Label>
                <Select value={indForm.matricula_supervisor || "__none__"}
                  onValueChange={(v) => setIndForm({ ...indForm, matricula_supervisor: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {funcionarios.filter(f => f.ativo).map(f => (
                      <SelectItem key={f.matricula + f.id} value={f.matricula}>
                        {f.matricula} — {f.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ind-meta">Meta de Produção</Label>
                <Input id="ind-meta" type="number" min="0" step="1" placeholder="Ex: 145000" value={indForm.meta_producao}
                  onChange={(e) => setIndForm({ ...indForm, meta_producao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ind-manual" className="flex items-center gap-1">
                  Produção Manual
                  <span className="text-xs font-normal text-muted-foreground">(sem app)</span>
                </Label>
                <Input id="ind-manual" type="number" min="0" step="1" placeholder="0"
                  value={indForm.producao_manual}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIndForm({ ...indForm, producao_manual: val });
                    if (val !== "" && Number(val) > 0) setIndMaquinas([]);
                  }} />
              </div>
            </div>

            {/* Máquinas com app */}
            {(() => {
              const bloqueado = indForm.producao_manual !== "" && Number(indForm.producao_manual) > 0;
              return (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5" /> Máquinas com app
                    <span className="text-xs text-muted-foreground font-normal">(produção sincronizada automaticamente)</span>
                  </Label>
                  {bloqueado ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                      Produção manual ativada — desative-a (valor = 0 ou vazio) para vincular máquinas com app.
                    </div>
                  ) : maquinasDisponiveis.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma máquina encontrada em registros_producao.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                      {maquinasDisponiveis.map(maq => (
                        <div key={maq} className="flex items-center gap-2">
                          <Checkbox
                            id={`maq-${maq}`}
                            checked={indMaquinas.includes(maq)}
                            onCheckedChange={(c) =>
                              setIndMaquinas(prev => c ? [...prev, maq] : prev.filter(m => m !== maq))
                            }
                          />
                          <label htmlFor={`maq-${maq}`} className="text-xs cursor-pointer leading-tight">{maq}</label>
                        </div>
                      ))}
                    </div>
                  )}
                  {!bloqueado && indMaquinas.length > 0 && (
                    <p className="text-xs text-muted-foreground">{indMaquinas.length} máquina(s) selecionada(s)</p>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleIndSave} disabled={savingInd}>
              {savingInd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
