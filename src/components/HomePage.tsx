"use client";

import { Factory, TrendingUp, TrendingDown, Minus, XCircle, Award, CalendarDays } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { MachineTimeline } from "./MachineTimeline";
import { ChartAreaComparativa } from "./ChartAreaComparativa";
import { useKpisDia } from "@/hooks/useKpisDia";
import { useProducaoDiaria } from "@/hooks/useProducaoDiaria";
import { useProducaoGraficos } from "@/hooks/useProducaoGraficos";
import { useEstatisticasProducao } from "@/hooks/useEstatisticasProducao";
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const VERDE   = "hsl(var(--primary))";
const VERDE_2 = "hsl(var(--primary))";
const LINE    = "hsl(var(--border))";
const INK     = "hsl(var(--foreground))";
const INK_S   = "hsl(var(--muted-foreground))";
const MUTED   = "hsl(var(--muted-foreground))";

function formatDate() {
  return new Date()
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".");
}

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] || "usuário";
}

function MaquinaTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = (payload?.value ?? "");
  const short = label.length > 21 ? label.slice(0, 20) + "…" : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-4} y={0} dy={4} textAnchor="end" fill={INK} fontSize={10}>
        {short}
      </text>
    </g>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span style={{ fontSize: 11, color: MUTED }}>sem histórico</span>;
  const up    = delta > 0;
  const same  = delta === 0;
  const color = up ? "#16a34a" : same ? MUTED : "#dc2626";
  const Icon  = up ? TrendingUp : same ? Minus : TrendingDown;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color }}>
      <Icon size={12} />
      {up ? "+" : ""}{delta}%
    </span>
  );
}

function truncateMachine(name: string, max = 22) {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

function Skel({ w, h = 12 }: { w: number; h?: number }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{ width: w, height: h, background: "hsl(var(--muted))" }}
    />
  );
}

function InsightCard({
  icon, label, main, sub, delta, loading,
}: {
  icon: React.ReactNode;
  label: string;
  main: string;
  sub?: string;
  delta?: number | null;
  loading: boolean;
}) {
  return (
    <div style={{
      background: "hsl(var(--card))", border: `1px solid ${LINE}`,
      borderRadius: 10, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span style={{ fontSize: 10, color: MUTED, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
          <Skel w={120} h={20} />
          <Skel w={80} />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 18, fontWeight: 600, color: INK, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {main}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {sub && <span style={{ fontSize: 11, color: MUTED }}>{sub}</span>}
            {delta !== undefined && <DeltaBadge delta={delta} />}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, loading }: { label: string; value: number | null; loading: boolean }) {
  return (
    <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
        {label}
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skel w={96} h={36} />
          <Skel w={72} />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 32, fontWeight: 300, color: INK, lineHeight: 1, letterSpacing: "-0.035em" }}>
            {value === null ? "—" : value.toLocaleString("pt-BR")}
            <span style={{ fontSize: 12, color: MUTED, marginLeft: 4, fontWeight: 500 }}>un</span>
          </div>
          <div style={{ fontSize: 11, marginTop: 10, color: MUTED, fontWeight: 400 }}>Acumulado hoje</div>
        </>
      )}
    </div>
  );
}

export default function HomePage({ userName = "" }: { userName?: string }) {
  const name     = firstWord(userName);
  const today    = formatDate();
  const kpis       = useKpisDia();
  const producao   = useProducaoDiaria();
  const graficos   = useProducaoGraficos();
  const insights   = useEstatisticasProducao();

  return (
    <div className="home-wrap" style={{ padding: "40px 48px 60px" }}>

      {/* ═══ HEADING ═══ */}
      <div className="home-heading" style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10.5, letterSpacing: "0.28em", color: VERDE, textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
          Visão geral · {today}
        </div>
        <h1 style={{ fontWeight: 300, fontSize: "clamp(36px, 3.6vw, 52px)", lineHeight: 1.02, letterSpacing: "-0.03em", color: VERDE_2, margin: 0 }}>
          Bem-vindo,<br />
          <em style={{ fontStyle: "normal", fontWeight: 600, color: VERDE, letterSpacing: "-0.035em" }}>{name}.</em>
        </h1>
        <p style={{ fontSize: 13.5, color: INK_S, marginTop: 14, maxWidth: 440, lineHeight: 1.55, fontWeight: 400, letterSpacing: "0.005em" }}>
          Acompanhe a produção e a qualidade das Portas em tempo real.
        </p>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="home-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Portas Prensadas hoje"   value={kpis.portasPrensadas}   loading={kpis.loading} />
        <KpiCard label="Kits Embalados hoje"      value={kpis.kitsEmbalados}      loading={kpis.loading} />
        <KpiCard label="Batentes Revestidos hoje" value={kpis.batentesRevestidos} loading={kpis.loading} />
        <KpiCard label="Alizares Revestidos hoje" value={kpis.alizaresRecobertos} loading={kpis.loading} />
      </div>

      {/* ═══ INSIGHTS ═══ */}
      <div className="home-insights" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>

        <InsightCard
          loading={insights.loading}
          icon={<TrendingUp size={13} style={{ color: VERDE }} />}
          label="Hoje vs média 30 dias"
          main={insights.loading ? "—" : insights.producaoHoje.toLocaleString("pt-BR") + " un"}
          sub={`média: ${insights.mediaUlt30Dias.toLocaleString("pt-BR")} un/dia`}
          delta={insights.deltaHojeVsMedia}
        />

        <InsightCard
          loading={insights.loading}
          icon={<Award size={13} style={{ color: VERDE }} />}
          label="Top máquina da semana"
          main={insights.topMaquinaSemana ? truncateMachine(insights.topMaquinaSemana) : "—"}
          sub={insights.topMaquinaSemana ? `${insights.topMaquinaSemanaTotal.toLocaleString("pt-BR")} un` : undefined}
          delta={insights.topMaquinaSemanaDelta}
        />

        <InsightCard
          loading={insights.loading}
          icon={<XCircle size={13} style={{ color: "#dc2626" }} />}
          label="Mais NCs hoje"
          main={insights.topMaquinaNcHoje ? truncateMachine(insights.topMaquinaNcHoje) : "Nenhuma NC hoje"}
          sub={insights.topMaquinaNcHoje ? `${insights.topMaquinaNcHojeTotal.toLocaleString("pt-BR")} itens NC` : undefined}
        />

        <InsightCard
          loading={insights.loading}
          icon={<CalendarDays size={13} style={{ color: VERDE }} />}
          label="Esta semana vs anterior"
          main={insights.loading ? "—" : insights.totalEstaSemana.toLocaleString("pt-BR") + " un"}
          sub={`semana passada: ${insights.totalSemanaPassada.toLocaleString("pt-BR")} un`}
          delta={insights.deltaSemanal}
        />

      </div>

      {/* ═══ SHOWCASE ═══ */}
      <div className="home-animation" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <MachineTimeline />
      </div>

      {/* ═══ BOTTOM GRID ═══ */}
      <div className="home-bottom" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

        {/* ── Gráficos de produção ── */}
        <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Comparativo Prensa Fria × Montagem do Kit */}
          <ChartAreaComparativa />

          {/* Top máquinas do mês */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Factory size={15} style={{ color: VERDE, flexShrink: 0 }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: VERDE_2, margin: 0, letterSpacing: "-0.01em" }}>
                Top máquinas — mês atual
              </h3>
            </div>
            <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 14, fontWeight: 400 }}>
              Peças conformes acumuladas no mês por máquina.
            </p>
            {graficos.loading ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}><SpinnerCustom /></div>
            ) : graficos.topMaquinas.length === 0 ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Sem dados no mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height={graficos.topMaquinas.length * 36 + 8}>
                <BarChart
                  layout="vertical"
                  data={graficos.topMaquinas}
                  margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="maquina"
                    tick={<MaquinaTick />}
                    axisLine={false}
                    tickLine={false}
                    width={155}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, padding: "4px 10px", borderColor: LINE }}
                    formatter={(v: number) => [v.toLocaleString("pt-BR") + " un", "Total"]}
                  />
                  <Bar dataKey="total" fill={VERDE} radius={[0, 4, 4, 0]} opacity={0.85}
                    label={{ position: "right", fontSize: 10, fill: MUTED, formatter: (v: number) => v.toLocaleString("pt-BR") }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* ── Produção diária por máquina ── */}
        <div style={{ background: "hsl(var(--card))", border: `1px solid ${LINE}`, borderRadius: 10, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Factory size={15} style={{ color: VERDE, flexShrink: 0 }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: VERDE_2, margin: 0, letterSpacing: "-0.01em" }}>
              Produção diária
            </h3>
          </div>
          <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 18, fontWeight: 400 }}>
            Quantidade produzida hoje por máquina.
          </p>

          {producao.loading ? (
            <div style={{ padding: "24px 0", display: "flex", justifyContent: "center" }}><SpinnerCustom /></div>
          ) : producao.data.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: MUTED, fontSize: 12 }}>Sem registros hoje.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {producao.data.map(m => {
                const max = producao.data[0].total || 1;
                const pct = Math.round((m.total / max) * 100);
                return (
                  <li key={m.maquina}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: INK, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.maquina}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: VERDE, flexShrink: 0 }}>
                        {m.total.toLocaleString("pt-BR")} un
                      </span>
                    </div>
                    <div style={{ height: 4, background: LINE, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--sidebar-accent)))",
                        borderRadius: 99, transition: "width .4s",
                      }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>

      <style>{`
        @media (max-width: 1100px) {
          .home-bottom { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1024px) {
          .home-kpis    { grid-template-columns: repeat(2, 1fr) !important; }
          .home-insights { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .home-wrap    { padding: 20px 16px 40px !important; }
          .home-animation { display: none !important; }
        }
        @media (max-width: 480px) {
          .home-kpis    { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .home-insights { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .home-heading h1 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
