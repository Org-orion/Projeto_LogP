"use client";

import { Factory, TrendingUp } from "lucide-react";
import { DoorKitAnimation } from "./DoorKitAnimation";
import { useKpisDia } from "@/hooks/useKpisDia";
import { useProducaoDiaria } from "@/hooks/useProducaoDiaria";
import { useProducaoGraficos } from "@/hooks/useProducaoGraficos";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const VERDE   = "#1f4d34";
const VERDE_2 = "#0f3a22";
const LINE    = "#e4e7e4";
const INK     = "#0f1a14";
const INK_S   = "#3a4a42";
const MUTED   = "#6b7a72";

function formatDate() {
  return new Date()
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".");
}

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] || "usuário";
}

function KpiCard({ label, value, loading }: { label: string; value: number | null; loading: boolean }) {
  const display = loading || value === null ? "—" : value.toLocaleString("pt-BR");
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 300, color: INK, lineHeight: 1, letterSpacing: "-0.035em" }}>
        {display}
        {!loading && <span style={{ fontSize: 12, color: MUTED, marginLeft: 4, fontWeight: 500 }}>un</span>}
      </div>
      <div style={{ fontSize: 11, marginTop: 10, color: MUTED, fontWeight: 400 }}>Acumulado hoje</div>
    </div>
  );
}

export default function HomePage({ userName = "" }: { userName?: string }) {
  const name     = firstWord(userName);
  const today    = formatDate();
  const kpis     = useKpisDia();
  const producao = useProducaoDiaria();
  const graficos = useProducaoGraficos();

  return (
    <div style={{ padding: "40px 48px 60px" }}>

      {/* ═══ HEADING ═══ */}
      <div style={{ marginBottom: 32 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Portas Prensadas hoje"   value={kpis.portasPrensadas}   loading={kpis.loading} />
        <KpiCard label="Kits Embalados hoje"      value={kpis.kitsEmbalados}      loading={kpis.loading} />
        <KpiCard label="Batentes Revestidos hoje" value={kpis.batentesRevestidos} loading={kpis.loading} />
        <KpiCard label="Alizares Revestidos hoje" value={kpis.alizaresRecobertos} loading={kpis.loading} />
      </div>

      {/* ═══ SHOWCASE ═══ */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ overflow: "hidden", background: "linear-gradient(180deg, #fafbf8, #f4f5f2)" }}>
          <DoorKitAnimation />
        </div>
      </div>

      {/* ═══ BOTTOM GRID ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

        {/* ── Gráficos de produção ── */}
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Tendência 14 dias */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <TrendingUp size={15} style={{ color: VERDE, flexShrink: 0 }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: VERDE_2, margin: 0, letterSpacing: "-0.01em" }}>
                Produção — últimos 14 dias
              </h3>
            </div>
            <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 14, fontWeight: 400 }}>
              Total de peças conformes por dia.
            </p>
            {graficos.loading ? (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Carregando…</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={graficos.tendencia} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={VERDE} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={VERDE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, padding: "4px 10px", borderColor: LINE }}
                    formatter={(v: number) => [v.toLocaleString("pt-BR") + " un", "Produção"]}
                  />
                  <Area type="monotone" dataKey="total" stroke={VERDE} strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: VERDE }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

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
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Carregando…</div>
            ) : graficos.topMaquinas.length === 0 ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Sem dados no mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height={graficos.topMaquinas.length * 36 + 8}>
                <BarChart
                  layout="vertical"
                  data={graficos.topMaquinas}
                  margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="maquina"
                    tick={{ fontSize: 10, fill: INK }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                    tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + "…" : v}
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
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "20px 22px" }}>
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
            <div style={{ padding: "24px 0", textAlign: "center", color: MUTED, fontSize: 12 }}>Carregando…</div>
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
                        background: "linear-gradient(90deg, #1f4d34, #3da06a)",
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
        @media (max-width: 768px) {
          .home-wrap { padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}
