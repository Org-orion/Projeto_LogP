"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// O módulo Qualidade virou rota real (/qualidade/...). Este componente só
// existe como rede de segurança pra quem ainda tem `logp_section=qualidade`
// salvo no localStorage de antes da migração — a navegação normal (sidebar)
// não passa mais por aqui.
const ROTA_POR_SUBSECTION: Record<string, string> = {
  gramatura:           "/qualidade/gramatura",
  recebimento:         "/qualidade/recebimento-insumos",
  "nao-conformidades": "/qualidade/nao-conformidades",
};

interface QualidadePageProps { subSection?: string; }

export default function QualidadePage({ subSection = "gramatura" }: QualidadePageProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROTA_POR_SUBSECTION[subSection] ?? "/qualidade/gramatura");
  }, [subSection, router]);

  return null;
}
