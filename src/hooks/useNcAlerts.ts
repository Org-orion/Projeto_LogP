import { useState, useEffect, useId } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";

export interface NcAlert {
  id: string;
  maquina: string;
  data: string;
  totalNC: number;
}

async function fetchNcAlerts(): Promise<NcAlert[]> {
  const hoje = new Date();
  const dataInicio = format(subDays(hoje, 6), "yyyy-MM-dd");
  const dataFim = format(hoje, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("registros_producao")
    .select("maquina,data,qtd_nao_conforme_1,qtd_nao_conforme_2,qtd_nao_conforme_3,qtd_nao_conforme_4")
    .gte("data", dataInicio)
    .lte("data", dataFim);

  if (error || !data) return [];

  const map: Record<string, NcAlert> = {};
  for (const row of data) {
    const total =
      (row.qtd_nao_conforme_1 ?? 0) +
      (row.qtd_nao_conforme_2 ?? 0) +
      (row.qtd_nao_conforme_3 ?? 0) +
      (row.qtd_nao_conforme_4 ?? 0);
    if (total === 0) continue;
    const key = `${row.maquina ?? "?"}__${row.data}`;
    if (!map[key]) {
      map[key] = { id: key, maquina: row.maquina ?? "—", data: row.data, totalNC: 0 };
    }
    map[key].totalNC += total;
  }

  return Object.values(map).sort((a, b) => b.data.localeCompare(a.data));
}

export function useNcAlerts() {
  const [data, setData] = useState<NcAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Nome de canal único por instância — este hook agora roda em mais de um
  // lugar ao mesmo tempo (NotificationPanel + indicador na barra de abas), e
  // o Supabase não permite duas assinaturas ativas com o mesmo nome de canal.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;

    function load() {
      setIsLoading(true);
      fetchNcAlerts().then((result) => {
        if (!cancelled) { setData(result); setIsLoading(false); }
      });
    }

    load();

    const channel = supabase
      .channel(`nc-alerts-rt-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_producao" }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [instanceId]);

  return { data, isLoading };
}
