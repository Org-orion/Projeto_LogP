import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DiaComparativo {
  date: string;
  prensaFria: number;
  montagemKit: number;
}

interface ProducaoComparativa {
  data: DiaComparativo[];
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

async function fetchAllPages(
  maquinaPattern: string,
  inicio: string,
  fim: string
): Promise<{ data: string; qtd_conforme: number | null }[]> {
  const TAM = 1000;
  let pagina = 0;
  const todos: { data: string; qtd_conforme: number | null }[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("registros_producao")
      .select("data, qtd_conforme")
      .ilike("maquina", maquinaPattern)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true })
      .range(pagina * TAM, (pagina + 1) * TAM - 1);

    if (error || !data || data.length === 0) break;
    todos.push(...(data as { data: string; qtd_conforme: number | null }[]));
    if (data.length < TAM) break;
    pagina++;
  }

  return todos;
}

export function useProducaoComparativa(): ProducaoComparativa {
  const [state, setState] = useState<ProducaoComparativa>({ data: [], loading: true });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const hoje = new Date();
      const inicio = dateStr(subDays(hoje, 89));
      const fim = dateStr(hoje);

      const [rowsPF, rowsMK] = await Promise.all([
        fetchAllPages("%prensa fria%", inicio, fim),
        fetchAllPages("%montagem do kit%", inicio, fim),
      ]);

      if (cancelled) return;

      // Mapa de 90 dias inicializado com zeros
      const mapaP: Record<string, number> = {};
      const mapaM: Record<string, number> = {};
      for (let i = 89; i >= 0; i--) {
        const d = dateStr(subDays(hoje, i));
        mapaP[d] = 0;
        mapaM[d] = 0;
      }

      for (const r of rowsPF) {
        if (r.data in mapaP) mapaP[r.data] += Number(r.qtd_conforme) || 0;
      }
      for (const r of rowsMK) {
        if (r.data in mapaM) mapaM[r.data] += Number(r.qtd_conforme) || 0;
      }

      const data: DiaComparativo[] = Object.keys(mapaP).map(date => ({
        date,
        prensaFria: mapaP[date],
        montagemKit: mapaM[date],
      }));

      setState({ data, loading: false });
    }

    void fetchData();

    const channel = supabase
      .channel("producao-comparativa-rt")
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
