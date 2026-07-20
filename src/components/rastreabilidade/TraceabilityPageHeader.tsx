"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

interface TraceabilityPageHeaderProps {
  ultimaAtualizacao?: Date | null;
}

// Cabeçalho da central de consulta — só título, descrição e "Como funciona".
// Nenhum texto técnico (recebe_de, ciclo, nó fantasma) aparece aqui de
// propósito: isso fica só na página do mapa (/rastreabilidade/mapa).
export function TraceabilityPageHeader({ ultimaAtualizacao }: TraceabilityPageHeaderProps) {
  const [comoFuncionaAberto, setComoFuncionaAberto] = useState(false);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Rastreabilidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulte lotes, AQs, máquinas e produtos para visualizar o fluxo completo do recebimento até a expedição.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {ultimaAtualizacao && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Última atualização: {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
          </span>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setComoFuncionaAberto(true)}>
          <HelpCircle className="h-3.5 w-3.5" />
          Como funciona
        </Button>
      </div>

      <Sheet open={comoFuncionaAberto} onOpenChange={setComoFuncionaAberto}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Como funciona a Rastreabilidade</SheetTitle>
            <SheetDescription>Entenda os conceitos usados nesta tela.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">O que é uma AQ?</p>
              <p>Anexo de Qualidade — a ficha que registra uma etapa da produção (recebimento, corte, montagem, acabamento, expedição etc.). Cada AQ preenchida gera um número de lote.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">O que é o lote de origem?</p>
              <p>É o material que deu origem ao lote atual — por exemplo, a chapa recebida que foi cortada para virar um batente. Um lote pode ter mais de uma origem.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Como funciona o fluxo?</p>
              <p>O material passa por várias AQs, do recebimento até a expedição. Cada etapa pode receber de uma ou mais etapas anteriores.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">O que significam os status?</p>
              <p><span className="font-medium text-foreground">Conforme</span> — sem não conformidades registradas. <span className="font-medium text-foreground">Não conforme</span> — há registro de não conformidade nessa etapa.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Como abrir o mapa?</p>
              <p>Selecione um resultado na tabela e escolha "Abrir mapa" ou "Visualizar mapa completo" no painel de detalhes — o mapa de fluxo abre numa página própria, com o caminho desse lote destacado.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
