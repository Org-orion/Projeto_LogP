import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ProducaoMaquina {
  maquina: string;
  total: number;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useProducaoDiaria() {
  const [data, setData]       = useState<ProducaoMaquina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const today = todayStr();
      const { data: rows, error } = await supabase
        .from("registros_producao")
        .select("maquina, qtd_conforme")
        .eq("data", today);

      if (cancelled) return;

      if (!error && rows) {
        const map: Record<string, number> = {};
        for (const row of rows) {
          const m = row.maquina as string;
          map[m] = (map[m] ?? 0) + ((row.qtd_conforme as number) ?? 0);
        }
        setData(
          Object.entries(map)
            .map(([maquina, total]) => ({ maquina, total }))
            .sort((a, b) => b.total - a.total),
        );
      }
      setLoading(false);
    }

    void fetch();
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
