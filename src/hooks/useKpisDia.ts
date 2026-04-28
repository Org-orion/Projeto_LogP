import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface KpisDia {
  portasPrensadas: number | null;
  kitsEmbalados: number | null;
  batentesRevestidos: number | null;
  alizaresRecobertos: number | null;
  loading: boolean;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useKpisDia(): KpisDia {
  const [state, setState] = useState<KpisDia>({
    portasPrensadas: null,
    kitsEmbalados: null,
    batentesRevestidos: null,
    alizaresRecobertos: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const today = todayStr();

      const { data, error } = await supabase
        .from("registros_producao")
        .select("maquina, qtd_conforme")
        .eq("data", today);

      if (cancelled) return;

      if (error || !data) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      let portasPrensadas = 0;
      let kitsEmbalados = 0;
      let batentesRevestidos = 0;
      let alizaresRecobertos = 0;

      for (const row of data) {
        const m = (row.maquina as string).toLowerCase();
        const qty = (row.qtd_conforme as number) ?? 0;

        if (m.includes("prensa fria")) portasPrensadas += qty;
        else if (m.includes("embalagem de kit")) kitsEmbalados += qty;
        else if (m.includes("gaidzinski")) batentesRevestidos += qty;
        else if (m.includes("unesa")) alizaresRecobertos += qty;
      }

      setState({
        portasPrensadas,
        kitsEmbalados,
        batentesRevestidos,
        alizaresRecobertos,
        loading: false,
      });
    }

    void fetch();
    return () => { cancelled = true; };
  }, []);

  return state;
}
