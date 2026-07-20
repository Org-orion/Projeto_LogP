"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequirePagina } from "@/components/RequirePagina";
import { SpinnerCustom } from "@/components/ui/spinner";
import { RastreabilidadeMapaView } from "@/components/rastreabilidade/RastreabilidadeMapaView";

// Acesso direto por URL/link/bookmark — o fluxo normal (a partir da busca)
// agora mostra o mapa embutido na própria página de consulta (ver
// src/app/rastreabilidade/page.tsx), sem abrir aba/rota nova.
function MapaRastreabilidadeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <RastreabilidadeMapaView
      loteParam={searchParams.get("lote")}
      aqParam={searchParams.get("aq")}
      numeroParam={searchParams.get("numero")}
      maquinaParam={searchParams.get("maquina")}
      onVoltar={() => router.push("/rastreabilidade")}
      onAbrirLote={(loteId) => router.push(`/rastreabilidade/mapa?lote=${encodeURIComponent(loteId)}`)}
    />
  );
}

export default function MapaRastreabilidadePage() {
  return (
    <RequirePagina pagina="rastreabilidade:consulta">
      <Suspense fallback={<div className="flex items-center justify-center h-64"><SpinnerCustom /></div>}>
        <MapaRastreabilidadeInner />
      </Suspense>
    </RequirePagina>
  );
}
