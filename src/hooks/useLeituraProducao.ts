"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface LeituraProducao {
  id: number;
  coletado_em: string;
  qtd_pecas: number | null;
  horas_trabalhadas: number | null;
  minutos_trabalhados: number | null;
  metros_lineares: number | null;
  temperatura: number | null;
  velocidade: number | null;
  maquina_id: string | null;
  maquina_nome: string | null;
  dados: Record<string, unknown> | null;
}

export function useLeituraProducao(limit = 100) {
  const [leituras, setLeituras] = useState<LeituraProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  async function load() {
    const { data, error: err } = await supabase
      .from("leituras_producao")
      .select("*")
      .order("coletado_em", { ascending: false })
      .limit(limit);

    if (cancelledRef.current) return;

    if (err) {
      setError(err.message);
    } else {
      setLeituras(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    void load();

    const channel = supabase
      .channel("leituras-producao-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "leituras_producao" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelledRef.current = true;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { leituras, loading, error };
}
