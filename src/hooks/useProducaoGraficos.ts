import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DiaTendencia {
  label: string;
  total: number;
}

export interface MaquinaMes {
  maquina: string;
  total: number;
}

interface ProducaoGraficos {
  tendencia: DiaTendencia[];
  topMaquinas: MaquinaMes[];
  loading: boolean;
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

export function useProducaoGraficos(): ProducaoGraficos {
  const [state, setState] = useState<ProducaoGraficos>({
    tendencia: [],
    topMaquinas: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const hoje = new Date();
      const inicio14 = dateStr(subDays(hoje, 13));
      const fim = dateStr(hoje);
      const mesInicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

      const TAM = 1000;

      // Tendência 14 dias — paginado
      const rows14: { data: string; qtd_conforme: number | null }[] = [];
      for (let p = 0; ; p++) {
        const { data: lote } = await supabase
          .from("registros_producao")
          .select("data, qtd_conforme")
          .gte("data", inicio14)
          .lte("data", fim)
          .order("data", { ascending: true })
          .range(p * TAM, (p + 1) * TAM - 1);
        if (!lote || lote.length === 0) break;
        rows14.push(...lote);
        if (lote.length < TAM) break;
      }

      // Top máquinas do mês — paginado
      const rowsMes: { maquina: string; qtd_conforme: number | null }[] = [];
      for (let p = 0; ; p++) {
        const { data: lote } = await supabase
          .from("registros_producao")
          .select("maquina, qtd_conforme")
          .gte("data", mesInicio)
          .lte("data", fim)
          .order("data", { ascending: true })
          .range(p * TAM, (p + 1) * TAM - 1);
        if (!lote || lote.length === 0) break;
        rowsMes.push(...lote);
        if (lote.length < TAM) break;
      }

      if (cancelled) return;

      // Tendência 14 dias
      const diasMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        diasMap[dateStr(subDays(hoje, i))] = 0;
      }
      for (const r of rows14 ?? []) {
        const d = r.data as string;
        if (d in diasMap) diasMap[d] += (r.qtd_conforme as number) ?? 0;
      }
      const tendencia = Object.entries(diasMap).map(([d, total]) => ({
        label: `${d.slice(8, 10)}/${d.slice(5, 7)}`,
        total,
      }));

      // Top máquinas do mês
      const maqMap: Record<string, number> = {};
      for (const r of rowsMes ?? []) {
        const m = (r.maquina as string) || "—";
        maqMap[m] = (maqMap[m] ?? 0) + ((r.qtd_conforme as number) ?? 0);
      }
      const topMaquinas = Object.entries(maqMap)
        .map(([maquina, total]) => ({ maquina, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 7);

      setState({ tendencia, topMaquinas, loading: false });
    }

    void fetchData();

    const channel = supabase
      .channel("producao-graficos-rt")
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
