import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface OpcoesCusteio {
  recobrimentos: string[];
  pinturas: string[];
  perfisAlizarPorEspessura: Record<number, string[]>;
  largurasBatente: number[];
  fechaduras: string[];
  dobradicas: string[];
}

const VAZIO: OpcoesCusteio = {
  recobrimentos: [], pinturas: [], perfisAlizarPorEspessura: {}, largurasBatente: [], fechaduras: [], dobradicas: [],
};

// Opções pro formulário do simulador — vêm sempre do banco (nunca hardcoded),
// pra nunca desalinhar do que o motor de cálculo realmente sabe resolver.
export function useOpcoesCusteio() {
  const [opcoes, setOpcoes] = useState<OpcoesCusteio>(VAZIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [mapaRec, gramaturas, perfis, larguras, ferragem] = await Promise.all([
        supabase.from("custeio_param_mapa_recobrimento").select("recobrimento").order("recobrimento"),
        supabase.from("custeio_param_pintura_gramaturas").select("pintura"),
        supabase.from("custeio_param_alizar_perfis").select("espessura_mm, perfil").order("perfil"),
        supabase.from("custeio_param_batente_larguras").select("largura_cm").order("largura_cm"),
        supabase.from("custeio_insumos").select("produto").eq("tipo", "Ferragem").eq("ativo", true).order("produto"),
      ]);
      if (cancelado) return;

      const perfisPorEspessura: Record<number, string[]> = {};
      for (const row of perfis.data ?? []) {
        (perfisPorEspessura[row.espessura_mm] ??= []).push(row.perfil);
      }

      const fechaduras: string[] = [];
      const dobradicas: string[] = [];
      for (const row of ferragem.data ?? []) {
        if (row.produto.startsWith("F ")) fechaduras.push(row.produto);
        else if (row.produto.startsWith("D ")) dobradicas.push(row.produto);
      }

      setOpcoes({
        recobrimentos: [...new Set((mapaRec.data ?? []).map((r) => r.recobrimento))],
        pinturas: [...new Set((gramaturas.data ?? []).map((r) => r.pintura))],
        perfisAlizarPorEspessura: perfisPorEspessura,
        largurasBatente: (larguras.data ?? []).map((r) => r.largura_cm),
        fechaduras,
        dobradicas,
      });
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, []);

  return { opcoes, loading };
}
