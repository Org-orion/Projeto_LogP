import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface NFResumo {
  id: string;
  numero_nota_fiscal: string;
  fornecedor: string;
  tipo_material: string;
  quantidade: number;
  unidade: string;
  status: "pendente" | "aprovado" | "reprovado";
  data_recebimento: string;
}

export function useUltimasNFs(limit = 5) {
  const [data, setData]       = useState<NFResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const { data: rows, error } = await supabase
        .from("materiais_fsc")
        .select("id, numero_nota_fiscal, fornecedor, tipo_material, quantidade, unidade, status, data_recebimento")
        .order("data_recebimento", { ascending: false })
        .limit(limit);

      if (cancelled) return;
      if (!error && rows) setData(rows as NFResumo[]);
      setLoading(false);
    }

    void fetch();
    return () => { cancelled = true; };
  }, [limit]);

  return { data, loading };
}
