import { useState, useEffect, useId } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";

export interface NfAlert {
  id: string;
  nf: string;
  data: string;
  maquina: string;
}

async function fetchNfAlerts(): Promise<NfAlert[]> {
  const dataInicio = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const TAM = 1000;

  // Paginação registros_producao
  let pagProd = 0;
  const prodData: { nota_fiscal: string | null; data: string; maquina: string }[] = [];
  while (true) {
    const { data: lote, error } = await supabase
      .from("registros_producao")
      .select("nota_fiscal,data,maquina")
      .or("maquina.ilike.recebimento de chapa%,maquina.ilike.recebimento de materiais%")
      .gte("data", dataInicio)
      .not("nota_fiscal", "is", null)
      .order("data", { ascending: true })
      .range(pagProd * TAM, (pagProd + 1) * TAM - 1);
    if (error || !lote || lote.length === 0) break;
    prodData.push(...lote);
    if (lote.length < TAM) break;
    pagProd++;
  }

  // Paginação material_certificado_fsc
  let pagFsc = 0;
  const fscData: { numero_nota_fiscal: string | number | null }[] = [];
  while (true) {
    const { data: lote, error } = await supabase
      .from("material_certificado_fsc")
      .select("numero_nota_fiscal")
      .order("id", { ascending: true })
      .range(pagFsc * TAM, (pagFsc + 1) * TAM - 1);
    if (error || !lote || lote.length === 0) break;
    fscData.push(...lote);
    if (lote.length < TAM) break;
    pagFsc++;
  }

  if (!prodData.length && !fscData.length) return [];

  const linkedNFs = new Set(
    fscData.map(r => String(r.numero_nota_fiscal).trim())
  );

  const map: Record<string, NfAlert> = {};
  for (const row of prodData) {
    const nf = row.nota_fiscal != null ? String(row.nota_fiscal).trim() : null;
    if (!nf || linkedNFs.has(nf)) continue;
    if (!map[nf]) {
      map[nf] = { id: `nf__${nf}`, nf, data: row.data ?? "", maquina: row.maquina ?? "—" };
    }
  }

  return Object.values(map).sort((a, b) => b.data.localeCompare(a.data));
}

export function useNfAlerts() {
  const [data, setData] = useState<NfAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Nome de canal único por instância — mesmo motivo do useNcAlerts.ts (hook
  // agora usado simultaneamente em NotificationPanel e no indicador de abas).
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;

    function load() {
      setIsLoading(true);
      fetchNfAlerts().then((result) => {
        if (!cancelled) { setData(result); setIsLoading(false); }
      });
    }

    load();

    const channel = supabase
      .channel(`nf-alerts-rt-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_producao" }, () => {
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "material_certificado_fsc" }, () => {
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
