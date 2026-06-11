import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface EstatisticasProducao {
  // Card 1 — hoje vs média 30 dias
  producaoHoje: number;
  mediaUlt30Dias: number;
  deltaHojeVsMedia: number | null;

  // Card 2 — máquina mais produtiva da semana
  topMaquinaSemana: string | null;
  topMaquinaSemanaTotal: number;
  topMaquinaSemanaDelta: number | null; // % vs 7 dias anteriores

  // Card 3 — máquina com mais NCs hoje
  topMaquinaNcHoje: string | null;
  topMaquinaNcHojeTotal: number;

  // Card 4 — comparativo semanal (seg→hoje vs mesma janela semana passada)
  totalEstaSemana: number;
  totalSemanaPassada: number;
  deltaSemanal: number | null;

  loading: boolean;
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function pct(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function mondayOf(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay(); // 0=dom, 1=seg…
  const diff = dow === 0 ? 6 : dow - 1;
  r.setDate(r.getDate() - diff);
  return r;
}

const EMPTY: EstatisticasProducao = {
  producaoHoje: 0,
  mediaUlt30Dias: 0,
  deltaHojeVsMedia: null,
  topMaquinaSemana: null,
  topMaquinaSemanaTotal: 0,
  topMaquinaSemanaDelta: null,
  topMaquinaNcHoje: null,
  topMaquinaNcHojeTotal: 0,
  totalEstaSemana: 0,
  totalSemanaPassada: 0,
  deltaSemanal: null,
  loading: true,
};

export function useEstatisticasProducao(): EstatisticasProducao {
  const [state, setState] = useState<EstatisticasProducao>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const hoje = new Date();
      const hojeStr = dateStr(hoje);
      // Busca 37 dias para cobrir: hoje + 30 dias histórico + 7 dias semana anterior
      const inicio = dateStr(subDays(hoje, 36));

      const { data, error } = await supabase
        .from("registros_producao")
        .select("data,maquina,qtd_conforme,qtd_nao_conforme_1,qtd_nao_conforme_2,qtd_nao_conforme_3,qtd_nao_conforme_4")
        .gte("data", inicio)
        .lte("data", hojeStr)
        .order("data", { ascending: false })
        .limit(5000);

      if (cancelled) return;

      console.log("[useEstatisticasProducao]", {
        hojeStr, inicio,
        rows: data?.length ?? 0,
        error,
        sample: data?.[0],
      });

      if (error || !data) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      // ── Datas de referência ──────────────────────────────────────────────
      const seg       = mondayOf(hoje);
      const segStr    = dateStr(seg);
      const segPasStr = dateStr(subDays(seg, 7));
      const hojePasStr = dateStr(subDays(hoje, 7));

      // ── Acumuladores ────────────────────────────────────────────────────
      let producaoHoje = 0;
      const diasMap: Record<string, number> = {};     // data → total conforme
      const semanaMap: Record<string, number> = {};   // maquina → total esta semana
      const semanaPasMap: Record<string, number> = {}; // maquina → total semana passada
      const ncHojeMap: Record<string, number> = {};   // maquina → NC hoje

      for (const row of data) {
        const d   = row.data as string;
        const m   = (row.maquina as string) ?? "—";
        const qtd = (row.qtd_conforme as number) ?? 0;
        const nc  =
          ((row.qtd_nao_conforme_1 as number) ?? 0) +
          ((row.qtd_nao_conforme_2 as number) ?? 0) +
          ((row.qtd_nao_conforme_3 as number) ?? 0) +
          ((row.qtd_nao_conforme_4 as number) ?? 0);

        // Hoje
        if (d === hojeStr) {
          producaoHoje += qtd;
          if (nc > 0) ncHojeMap[m] = (ncHojeMap[m] ?? 0) + nc;
        }

        // Média 30 dias (exclui hoje)
        if (d !== hojeStr) {
          diasMap[d] = (diasMap[d] ?? 0) + qtd;
        }

        // Esta semana (seg → hoje)
        if (d >= segStr && d <= hojeStr) {
          semanaMap[m] = (semanaMap[m] ?? 0) + qtd;
        }

        // Semana passada (mesmo intervalo)
        if (d >= segPasStr && d <= hojePasStr) {
          semanaPasMap[m] = (semanaPasMap[m] ?? 0) + qtd;
        }
      }

      // ── Card 1: hoje vs média 30 dias ────────────────────────────────────
      const valoresDias = Object.values(diasMap).filter(v => v > 0);
      const mediaUlt30Dias = valoresDias.length > 0
        ? Math.round(valoresDias.reduce((a, b) => a + b, 0) / valoresDias.length)
        : 0;
      const deltaHojeVsMedia = pct(producaoHoje, mediaUlt30Dias);

      // ── Card 2: top máquina da semana ────────────────────────────────────
      const semanaEntries = Object.entries(semanaMap).sort((a, b) => b[1] - a[1]);
      const topMaquinaSemana      = semanaEntries[0]?.[0] ?? null;
      const topMaquinaSemanaTotal = semanaEntries[0]?.[1] ?? 0;
      const topMaquinaSemanaDelta = topMaquinaSemana
        ? pct(topMaquinaSemanaTotal, semanaPasMap[topMaquinaSemana] ?? 0)
        : null;

      // ── Card 3: top NC hoje ───────────────────────────────────────────────
      const ncEntries = Object.entries(ncHojeMap).sort((a, b) => b[1] - a[1]);
      const topMaquinaNcHoje      = ncEntries[0]?.[0] ?? null;
      const topMaquinaNcHojeTotal = ncEntries[0]?.[1] ?? 0;

      // ── Card 4: comparativo semanal ───────────────────────────────────────
      const totalEstaSemana   = Object.values(semanaMap).reduce((a, b) => a + b, 0);
      const totalSemanaPassada = Object.values(semanaPasMap).reduce((a, b) => a + b, 0);
      const deltaSemanal = pct(totalEstaSemana, totalSemanaPassada);

      setState({
        producaoHoje,
        mediaUlt30Dias,
        deltaHojeVsMedia,
        topMaquinaSemana,
        topMaquinaSemanaTotal,
        topMaquinaSemanaDelta,
        topMaquinaNcHoje,
        topMaquinaNcHojeTotal,
        totalEstaSemana,
        totalSemanaPassada,
        deltaSemanal,
        loading: false,
      });
    }

    void fetchData();

    const channel = supabase
      .channel("estatisticas-producao-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_producao" }, () => {
        void fetchData();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
