"use client";

import { Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Criticidade = "baixa" | "media" | "alta";

export interface NotificationChannel { key: string; label: string }
export interface NotificationRow {
  id: string;
  label: string;
  criticidade: Criticidade;
  canais: Record<string, boolean>;
}

interface NotificationMatrixProps {
  canais: NotificationChannel[];
  rows: NotificationRow[];
  onToggleCanal: (rowId: string, canal: string) => void;
  onCriticidadeChange: (rowId: string, criticidade: Criticidade) => void;
  onTestar: (rowId: string) => void;
}

const CRITICIDADE_LABEL: Record<Criticidade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export function NotificationMatrix({ canais, rows, onToggleCanal, onCriticidadeChange, onTestar }: NotificationMatrixProps) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[220px]">Evento</TableHead>
            <TableHead className="w-28">Criticidade</TableHead>
            {canais.map((c) => (
              <TableHead key={c.key} className="text-center w-24">{c.label}</TableHead>
            ))}
            <TableHead className="w-20 text-right">Testar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>
                <Select value={row.criticidade} onValueChange={(v) => onCriticidadeChange(row.id, v as Criticidade)}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["baixa", "media", "alta"] as Criticidade[]).map((c) => (
                      <SelectItem key={c} value={c}>{CRITICIDADE_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {canais.map((c) => (
                <TableCell key={c.key} className="text-center">
                  <Switch checked={row.canais[c.key] ?? false} onCheckedChange={() => onToggleCanal(row.id, c.key)} />
                </TableCell>
              ))}
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Enviar teste" onClick={() => onTestar(row.id)}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
