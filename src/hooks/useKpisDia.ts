import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface KpiMetric {
  /** Total de hoje. */
  value: number | null;
  /** Variação % de hoje vs a média dos 6 dias anteriores. Null sem base de comparação (ex.: todos zerados). */
  delta: number | null;
  /** Média diária dos 6 dias anteriores (mesma base do `delta`). Null sem histórico. */
  avg: number | null;
  /** Totais diários dos últimos 7 dias, do mais antigo para hoje (índice 6 = hoje). */
  spark: number[];
}

interface KpisDia {
  portasPrensadas: KpiMetric;
  kitsEmbalados: KpiMetric;
  batentesRevestidos: KpiMetric;
  alizaresRecobertos: KpiMetric;
  /** Abreviação do dia da semana de cada posição do `spark` (mesmo tamanho, índice 6 = hoje). */
  weekdayLabels: string[];
  loading: boolean;
}

const WEEKDAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const DAYS = 7;

function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyMetric(): KpiMetric {
  return { value: null, delta: null, avg: null, spark: Array(DAYS).fill(0) };
}

export function useKpisDia(): KpisDia {
  const [state, setState] = useState<KpisDia>({
    portasPrensadas: emptyMetric(),
    kitsEmbalados: emptyMetric(),
    batentesRevestidos: emptyMetric(),
    alizaresRecobertos: emptyMetric(),
    weekdayLabels: Array(DAYS).fill(""),
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const today = new Date();
      const days: Date[] = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d);
      }
      const dayStrs = days.map(dateStr);

      // Uma query por dia — o volume de registros de 7 dias inteiros somado
      // (todas as máquinas) passa de 1000 linhas, e o Supabase corta
      // silenciosamente qualquer resposta não paginada nesse limite. Uma
      // query por dia mantém cada resposta bem abaixo desse teto.
      const results = await Promise.all(
        dayStrs.map(dayStr =>
          supabase
            .from("registros_producao")
            .select("maquina, qtd_conforme")
            .eq("data", dayStr)
        )
      );

      if (cancelled) return;

      if (results.some(r => r.error)) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const sparkPortas = Array(DAYS).fill(0);
      const sparkKits = Array(DAYS).fill(0);
      const sparkBatentes = Array(DAYS).fill(0);
      const sparkAlizares = Array(DAYS).fill(0);

      results.forEach((r, idx) => {
        for (const row of r.data ?? []) {
          const m = (row.maquina as string).toLowerCase();
          const qty = (row.qtd_conforme as number) ?? 0;

          if (m.includes("prensa fria")) sparkPortas[idx] += qty;
          else if (m.includes("embalagem de kit")) sparkKits[idx] += qty;
          else if (m.includes("gaidzinski")) sparkBatentes[idx] += qty;
          else if (m.includes("unesa")) sparkAlizares[idx] += qty;
        }
      });

      function toMetric(spark: number[]): KpiMetric {
        const value = spark[DAYS - 1];
        const prev = spark.slice(0, DAYS - 1);
        const avgPrev = prev.reduce((a, b) => a + b, 0) / prev.length;
        const delta = avgPrev > 0 ? Math.round(((value - avgPrev) / avgPrev) * 1000) / 10 : null;
        const avg = avgPrev > 0 ? Math.round(avgPrev) : null;
        return { value, delta, avg, spark };
      }

      setState({
        portasPrensadas: toMetric(sparkPortas),
        kitsEmbalados: toMetric(sparkKits),
        batentesRevestidos: toMetric(sparkBatentes),
        alizaresRecobertos: toMetric(sparkAlizares),
        weekdayLabels: days.map(d => WEEKDAY[d.getDay()]),
        loading: false,
      });
    }

    void load();

    const channel = supabase
      .channel("kpis-dia-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_producao" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
