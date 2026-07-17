"use client";

import { FlaskConical } from "lucide-react";

// Aviso reutilizável pras páginas de Configurações que ainda não têm tabela
// própria no Supabase — a interface é real, mas o estado é só local (não
// persiste). Ver plano/resumo final pro SQL de cada tabela pendente.
export function MockDataBanner({ className, titulo = "Dados de exemplo.", mensagem }: { className?: string; titulo?: string; mensagem?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-foreground ${className ?? ""}`}
    >
      <FlaskConical className="h-4 w-4 shrink-0 text-warning mt-0.5" />
      <p>
        <span className="font-semibold">{titulo}</span>{" "}
        {mensagem ?? "Esta tela ainda não está conectada a uma tabela no banco — as alterações ficam só nesta sessão do navegador. Assim que a tabela correspondente for criada, a persistência real é ligada aqui."}
      </p>
    </div>
  );
}
