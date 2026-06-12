"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer, ChartLegend, ChartLegendContent,
  ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpinnerCustom } from "@/components/ui/spinner";
import { useProducaoComparativa } from "@/hooks/useProducaoComparativa";

const chartConfig = {
  prensaFria: {
    label: "Prensa Fria",
    color: "#86efac",
  },
  montagemKit: {
    label: "Montagem do Kit",
    color: "#216C3B",
  },
} satisfies ChartConfig;

export function ChartAreaComparativa() {
  const [timeRange, setTimeRange] = React.useState("90d");
  const { data, loading } = useProducaoComparativa();

  const filtered = data.filter((item) => {
    const hoje = new Date();
    const days = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90;
    const start = new Date(hoje);
    start.setDate(start.getDate() - days);
    if (item.date < start.toISOString().slice(0, 10)) return false;
    // Remove domingos (getDay() === 0) — sem produção, geram vales desnecessários
    const diaSemana = new Date(item.date + "T12:00:00").getDay();
    return diaSemana !== 0;
  });

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Prensa Fria × Montagem do Kit</CardTitle>
          <CardDescription>Peças conformes por dia — comparativo</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Período"
          >
            <SelectValue placeholder="Últimos 90 dias" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Últimos 90 dias</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Últimos 30 dias</SelectItem>
            <SelectItem value="7d"  className="rounded-lg">Últimos 7 dias</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <SpinnerCustom />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="fillPrensaFria" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-prensaFria)"  stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-prensaFria)"  stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillMontagemKit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-montagemKit)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-montagemKit)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  const [, mm, dd] = value.split("-");
                  return `${dd}/${mm}`;
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: string) => {
                      const [ano, mm, dd] = value.split("-");
                      return `${dd}/${mm}/${ano}`;
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="prensaFria"
                type="natural"
                fill="url(#fillPrensaFria)"
                stroke="var(--color-prensaFria)"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="montagemKit"
                type="natural"
                fill="url(#fillMontagemKit)"
                stroke="var(--color-montagemKit)"
                strokeWidth={2}
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
