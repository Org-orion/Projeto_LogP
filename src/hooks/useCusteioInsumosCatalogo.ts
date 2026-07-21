import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CusteioInsumoCatalogo {
  id: string;
  tipo: string;
  produto: string;
  unidade: string;
  preco_atual: number;
  preco_anterior: number | null;
  ativo: boolean;
  observacao: string;
}

// Catálogo completo (ativos e inativos) — diferente de useCusteioInsumos
// (Fase 1, snapshots de import); esta é a tabela viva que o motor de cálculo
// consulta em tempo real.
export function useCusteioInsumosCatalogo() {
  const [data, setData] = useState<CusteioInsumoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("custeio_insumos")
      .select("*")
      .order("tipo")
      .order("produto");
    setData(!error && rows ? (rows as CusteioInsumoCatalogo[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  async function atualizarPreco(id: string, precoAtual: number) {
    const atual = data.find((i) => i.id === id);
    const { error } = await supabase
      .from("custeio_insumos")
      .update({ preco_atual: precoAtual, preco_anterior: atual?.preco_atual ?? null })
      .eq("id", id);
    if (!error) {
      setData((prev) => prev.map((i) => (i.id === id ? { ...i, preco_atual: precoAtual, preco_anterior: atual?.preco_atual ?? null } : i)));
    }
    return { error };
  }

  async function atualizarAtivo(id: string, ativo: boolean) {
    const { error } = await supabase.from("custeio_insumos").update({ ativo }).eq("id", id);
    if (!error) setData((prev) => prev.map((i) => (i.id === id ? { ...i, ativo } : i)));
    return { error };
  }

  // Edição completa (dialog "editar insumo") — tipo/produto formam a chave que
  // o motor usa pra achar o preço, então recalculamos "chave" junto.
  async function atualizarInsumo(id: string, campos: { tipo: string; produto: string; unidade: string; preco_atual: number }) {
    const atual = data.find((i) => i.id === id);
    const chave = `${campos.tipo}${campos.produto}`;
    const mudouPreco = atual && campos.preco_atual !== atual.preco_atual;
    const { error } = await supabase
      .from("custeio_insumos")
      .update({
        ...campos,
        chave,
        preco_anterior: mudouPreco ? atual!.preco_atual : atual?.preco_anterior ?? null,
      })
      .eq("id", id);
    if (!error) {
      setData((prev) => prev.map((i) => (i.id === id
        ? { ...i, ...campos, preco_anterior: mudouPreco ? atual!.preco_atual : i.preco_anterior }
        : i)));
    }
    return { error };
  }

  return { data, loading, refetch, atualizarPreco, atualizarAtivo, atualizarInsumo };
}
