"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { CusteioSimuladorForm } from "./CusteioSimuladorForm";
import { CusteioResultadoDetalhado, CusteioResultadoKpis, type ResultadoKitCompletoView } from "./CusteioResultadoDetalhado";
import type { ConfiguracaoCusteio } from "@/lib/custeio-motor/types";

const DEBOUNCE_MS = 350;

export function CusteioSimuladorView() {
  const [resultado, setResultado] = useState<ResultadoKitCompletoView | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function calcular(config: ConfiguracaoCusteio) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetch("/api/custeio/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao calcular.");
        setResultado(json.data);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro desconhecido ao calcular.");
      } finally {
        setCarregando(false);
      }
    }, DEBOUNCE_MS);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="space-y-4">
      {resultado && <CusteioResultadoKpis resultado={resultado} />}

      <CusteioSimuladorForm onChange={calcular} />

      {erro && (
        <div className="flex items-center gap-2 rounded-md border border-red-600/30 bg-red-600/5 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      {carregando && !resultado && (
        <div className="flex items-center justify-center py-12"><SpinnerCustom /></div>
      )}

      {resultado && (
        <div className={carregando ? "opacity-60 transition-opacity" : ""}>
          <CusteioResultadoDetalhado resultado={resultado} />
        </div>
      )}
    </div>
  );
}
