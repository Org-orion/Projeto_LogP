"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cog, Plus, History, Pencil } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge, isMaquinaAtiva } from "./StatusBadge";
import type { Maquina } from "./types";

export function MaquinaCard({
  maquina,
  producaoPorSemana,
  totalMes,
  periodoLabel,
  onClick,
  onEdit,
  onLancar,
  canEdit,
}: {
  maquina: Maquina;
  producaoPorSemana: { label: string; producao: number }[];
  totalMes: number;
  periodoLabel?: string;
  onClick: () => void;
  onEdit: (m: Maquina) => void;
  onLancar?: (() => void) | null;
  canEdit: boolean;
}) {
  const nome = (maquina.nome as string) || `Máquina ${maquina.id}`;
  const isAtiva = isMaquinaAtiva(maquina.status as string | undefined);

  return (
    <Card
      className={`flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 ${
        isAtiva ? "border-l-primary" : "border-l-muted-foreground/30"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-1.5 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAtiva ? "bg-primary/10" : "bg-muted"
            }`}>
              <Cog className={`h-4 w-4 ${isAtiva ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold leading-tight truncate">{nome}</CardTitle>
              <StatusBadge status={maquina.status as string | undefined} className="mt-1 px-1.5 py-0 text-[10px]" />
            </div>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(maquina); }}
              title="Editar nome"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 flex-1 pt-0.5 px-3 pb-3">
        {/* Produção do período em destaque */}
        <div className={`rounded-lg px-2.5 py-1.5 ${isAtiva ? "bg-primary/5" : "bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground mb-0.5 capitalize">
            {periodoLabel ?? format(new Date(), "MMMM yyyy", { locale: ptBR })}
          </p>
          <p className={`text-xl font-bold leading-tight ${isAtiva ? "text-primary" : "text-muted-foreground"}`}>
            {totalMes.toLocaleString("pt-BR")}
            <span className="text-xs font-normal ml-1 text-muted-foreground">pç</span>
          </p>
        </div>

        {/* Mini gráfico */}
        {totalMes > 0 ? (
          <ResponsiveContainer width="100%" height={56}>
            <BarChart data={producaoPorSemana} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: "4px 8px" }}
                formatter={(v: number) => [v.toLocaleString("pt-BR") + " pç", "Produção"]}
              />
              <Bar dataKey="producao" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[56px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Sem registros no período
          </div>
        )}

        <div className="flex flex-col gap-1.5 mt-auto pt-0.5">
          {onLancar && (
            <Button
              size="sm"
              variant="default"
              className="w-full text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onLancar(); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Lançar Produção
            </Button>
          )}
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
            <History className="h-3 w-3" />
            Ver histórico completo
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
