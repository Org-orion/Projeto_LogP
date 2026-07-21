"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown, Minus, MoreVertical, Copy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL: Record<string, string> = {
  DOM: "Domingo", SEG: "Segunda-feira", TER: "Terça-feira", QUA: "Quarta-feira",
  QUI: "Quinta-feira", SEX: "Sexta-feira", SAB: "Sábado",
};

export interface KpiCardProps {
  icon: LucideIcon;
  title: string;
  value: number | null;
  unit?: string;
  /** Formatação customizada do valor (ex.: moeda) — quando presente, substitui `value.toLocaleString()` + `unit`. */
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  /** Variação — só usada pra decidir a cor/direção da seta (alta/baixa/estável). Omitir quando não há base de comparação. */
  delta?: number | null;
  /** Ex.: "vs média 7 dias". Ignorado quando `avgLabel` é passado. */
  comparisonLabel?: string;
  /** Texto estático mostrado quando não há `delta` nenhum (não é uma comparação — ex.: "SKU ABC123"). */
  caption?: string;
  /** Texto já formatado com o valor absoluto da média (ex.: "Média 7 dias: 2.000 un") — mostrado no lugar do percentual quando presente. */
  avgLabel?: string;
  /** Últimos dias, do mais antigo para o mais recente (última posição = hoje). */
  spark?: number[];
  /** Abreviações de dia da semana alinhadas ao `spark` (mesmo tamanho). */
  weekdayLabels?: string[];
  /** Variant barra horizontal (ex.: máquinas online) em vez de sparkline. */
  progress?: { current: number; total: number };
  className?: string;
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function Sparkline({ data, weekdayLabels }: { data: number[]; weekdayLabels?: string[] }) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const W = 100;
  const H = 26;
  const n = data.length;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const pointAt = (i: number) => {
    const x = n > 1 ? (i / (n - 1)) * W : W / 2;
    const y = H - ((data[i] - min) / range) * H;
    return { x, y };
  };

  const points = data.map((_, i) => pointAt(i));
  const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n < 2) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const label = hoverIdx !== null ? weekdayLabels?.[hoverIdx] : undefined;
  const fullLabel = label ? WEEKDAY_FULL[label] ?? label : undefined;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-7 overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <filter id="kpiSparkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polyline
          points={path}
          fill="none"
          stroke="#86efac"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#kpiSparkGlow)"
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
        {hovered && (
          <>
            <line x1={hovered.x} y1={0} x2={hovered.x} y2={H} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle cx={hovered.x} cy={hovered.y} r={2.2} fill="#d9fbe4" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      {hovered && fullLabel && (
        <div
          className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-md bg-[#0f2419] border border-white/10 px-2 py-1 text-[10px] shadow-lg"
          style={{ left: `${(hovered.x / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="font-semibold text-white">{fullLabel}</div>
          <div className="text-white/70 tabular-nums">{data[hoverIdx!].toLocaleString("pt-BR")} un</div>
        </div>
      )}
    </div>
  );
}

function WeekdayRow({ labels, todayIndex }: { labels: string[]; todayIndex: number }) {
  return (
    <div className="flex justify-between mt-1">
      {labels.map((label, i) => {
        const isToday = i === todayIndex;
        return (
          <div key={i} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
            <span className={cn(
              "text-[8.5px] font-medium tracking-wide",
              isToday ? "text-white/95" : "text-white/40",
            )}>
              {label}
            </span>
            {isToday && <span className="h-0.5 w-0.5 rounded-full bg-white/95" />}
          </div>
        );
      })}
    </div>
  );
}

export function KpiCard({
  icon: Icon, title, value, unit = "un", valueFormatter, loading = false,
  delta, comparisonLabel, avgLabel, caption, spark, weekdayLabels, progress, className,
}: KpiCardProps) {
  const temTendencia = delta !== undefined && delta !== null;
  const subiu = temTendencia && delta! > 0;
  const caiu = temTendencia && delta! < 0;
  const TrendIcon = subiu ? ArrowUp : caiu ? ArrowDown : Minus;
  const trendColor = subiu ? "text-emerald-300" : caiu ? "text-rose-300" : "text-white/50";

  function copiarValor() {
    if (value === null) return;
    void navigator.clipboard.writeText(String(value));
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-5 text-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md overflow-hidden",
        className,
      )}
      style={{
        backgroundImage: "linear-gradient(180deg, hsl(var(--primary)) 0%, color-mix(in srgb, hsl(var(--primary)) 100%, black 14%) 100%)",
      }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/85 truncate">
            {title}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Ações do indicador"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copiarValor} disabled={value === null}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copiar valor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Valor */}
      {loading ? (
        <div className="relative mt-3 space-y-2">
          <Skeleton className="h-8 w-24 bg-white/15" />
          <Skeleton className="h-3 w-20 bg-white/15" />
        </div>
      ) : (
        <>
          <div className="relative mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold leading-none tracking-tight tabular-nums">
              {value === null ? "—" : valueFormatter ? valueFormatter(value) : value.toLocaleString("pt-BR")}
            </span>
            {!valueFormatter && <span className="text-xs font-medium text-white/60">{unit}</span>}
          </div>

          <div className="relative mt-1.5 h-4 text-xs">
            {temTendencia ? (
              <span className={cn("inline-flex items-center gap-1", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {avgLabel ? (
                  <span className="font-normal text-white/70">{avgLabel}</span>
                ) : (
                  <>
                    {formatDelta(delta!)}
                    {comparisonLabel && <span className="text-white/50 font-normal">{comparisonLabel}</span>}
                  </>
                )}
              </span>
            ) : delta === null && (comparisonLabel || avgLabel) ? (
              <span className="text-white/40">sem histórico ainda</span>
            ) : caption ? (
              <span className="text-white/50">{caption}</span>
            ) : null}
          </div>

          {progress ? (
            <div className="relative mt-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/70 tabular-nums">
                  {progress.current} / {progress.total}
                </span>
                <span className="text-[11px] text-white/50 tabular-nums">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/85 transition-all duration-500"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : spark && spark.length > 1 ? (
            <div className="relative mt-3.5">
              <Sparkline data={spark} weekdayLabels={weekdayLabels} />
              {weekdayLabels && weekdayLabels.length === spark.length && (
                <WeekdayRow labels={weekdayLabels} todayIndex={weekdayLabels.length - 1} />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
