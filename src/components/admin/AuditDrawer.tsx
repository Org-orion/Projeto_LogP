"use client";

import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { AuditLogRow } from "@/components/admin/AuditTable";

interface AuditDrawerProps {
  row: AuditLogRow | null;
  onOpenChange: (open: boolean) => void;
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export function AuditDrawer({ row, onOpenChange }: AuditDrawerProps) {
  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalhe do evento</SheetTitle>
        </SheetHeader>
        {row && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <Campo label="Data" value={format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss")} />
              <Badge variant="outline" className={row.resultado === "sucesso" ? "text-xs border-primary/30 text-primary bg-primary/5" : "text-xs border-destructive/30 text-destructive bg-destructive/5"}>
                {row.resultado === "sucesso" ? "Sucesso" : "Falha"}
              </Badge>
            </div>
            <Campo label="Usuário" value={row.usuario_nome ?? "—"} />
            <Campo label="Ação" value={row.acao} />
            <Campo label="Módulo" value={row.modulo} />
            <Campo label="Entidade" value={row.entidade ?? "—"} />
            <Campo label="Descrição" value={row.descricao} />
            <Campo label="Endereço IP" value={row.ip ?? "—"} />
            <Campo label="Navegador" value={row.user_agent ?? "—"} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
