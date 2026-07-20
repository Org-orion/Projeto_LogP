"use client";

import { useEffect, useState } from "react";
import {
  buscarCadeiaCompleta, buscarOrigensEDestinos,
  type CadeiaCompleta, type LoteGroup,
} from "./aqSearch";

export interface DetalhesDoLote {
  origins: LoteGroup[];
  children: LoteGroup[];
  /** Cadeia completa (todos os níveis) — carregada à parte, não atrasa `origins`/`children`. */
  cadeia: CadeiaCompleta | null;
  loading: boolean;
  cadeiaLoading: boolean;
  error: string | null;
}

/**
 * Carrega as relações (origem/destino diretos + cadeia completa recursiva)
 * de um lote já conhecido — mesmo padrão usado em 3 lugares (drawer da
 * página de consulta, contexto principal do mapa, painel "Lotes da AQ" do
 * mapa): busca rápida de 1 passo primeiro (feedback imediato), depois a
 * cadeia completa em segundo plano.
 */
export function useDetalhesDoLote(group: LoteGroup | null): DetalhesDoLote {
  const [origins, setOrigins] = useState<LoteGroup[]>([]);
  const [children, setChildren] = useState<LoteGroup[]>([]);
  const [cadeia, setCadeia] = useState<CadeiaCompleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [cadeiaLoading, setCadeiaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!group) {
      setOrigins([]);
      setChildren([]);
      setCadeia(null);
      setError(null);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setOrigins([]);
    setChildren([]);
    setCadeia(null);
    setError(null);

    buscarOrigensEDestinos(group)
      .then(async (relacionados) => {
        if (cancelado) return;
        setOrigins(relacionados.origins);
        setChildren(relacionados.children);
        setLoading(false);

        setCadeiaLoading(true);
        const cadeiaCompleta = await buscarCadeiaCompleta(group);
        if (cancelado) return;
        setCadeia(cadeiaCompleta);
        setCadeiaLoading(false);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(String(err));
        setLoading(false);
        setCadeiaLoading(false);
      });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  return { origins, children, cadeia, loading, cadeiaLoading, error };
}
