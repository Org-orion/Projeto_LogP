import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  OverheadCategoria, OverheadExcecao, OverheadFatorComponente, RegraConsumo,
} from "@/lib/custeio-motor/types";

export interface ConsolidacaoExcecaoView {
  descricao: string;
  componente_origem: string;
  item: string;
  condicao: string;
  efeito: string;
  fonte: string;
  ativo: boolean;
}

export interface DocumentacaoMotor {
  regras: RegraConsumo[];
  overheadCategorias: OverheadCategoria[];
  overheadFatores: OverheadFatorComponente[];
  overheadExcecoes: OverheadExcecao[];
  consolidacaoExcecoes: ConsolidacaoExcecaoView[];
}

const VAZIO: DocumentacaoMotor = {
  regras: [], overheadCategorias: [], overheadFatores: [], overheadExcecoes: [], consolidacaoExcecoes: [],
};

// Expõe as tabelas de regra do motor em formato legível — a mesma fonte que
// o /api/custeio/calcular usa pra calcular, só que aqui é só pra consulta
// (aba "Como é Calculado").
export function useCusteioDocumentacaoMotor() {
  const [dados, setDados] = useState<DocumentacaoMotor>(VAZIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [regras, overheadCategorias, overheadFatores, overheadExcecoes, consolidacaoExcecoes] = await Promise.all([
        supabase.from("custeio_regras_consumo").select("*").order("componente").order("categoria").order("ordem"),
        supabase.from("custeio_overhead_categorias").select("*").order("categoria"),
        supabase.from("custeio_overhead_fatores_componente").select("*").order("perfil"),
        supabase.from("custeio_overhead_excecoes").select("*").order("componente"),
        supabase.from("custeio_consolidacao_excecoes").select("*").order("componente_origem"),
      ]);
      if (cancelado) return;
      setDados({
        regras: regras.data ?? [],
        overheadCategorias: overheadCategorias.data ?? [],
        overheadFatores: overheadFatores.data ?? [],
        overheadExcecoes: overheadExcecoes.data ?? [],
        consolidacaoExcecoes: consolidacaoExcecoes.data ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, []);

  return { dados, loading };
}
