"use client";

import type { EstatisticasProducao } from "@/hooks/useEstatisticasProducao";
import type { ProducaoMaquina } from "@/hooks/useProducaoDiaria";

interface Props {
  insights: EstatisticasProducao;
  maquinas: ProducaoMaquina[];
  maquinasLoading: boolean;
}

function Skel({ w, h }: { w: number | string; h: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, background: "rgba(255,255,255,0.07)", borderRadius: 6 }}
    />
  );
}

function StatCol({
  label, value, unit, accent = false, loading,
}: {
  label: string;
  value: string | number;
  unit: string;
  accent?: boolean;
  loading: boolean;
}) {
  return (
    <div style={{
      flex: 1, padding: "32px 32px 28px",
      borderTop: `2px solid ${accent ? "#5dc287" : "rgba(61,160,106,0.22)"}`,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{
        fontSize: 9.5, fontWeight: 700,
        color: accent ? "rgba(93,194,135,0.85)" : "rgba(255,255,255,0.35)",
        letterSpacing: "0.18em", textTransform: "uppercase",
      }}>
        {label}
      </span>

      {loading
        ? <Skel w={110} h={48} />
        : (
          <span style={{
            fontSize: 48, fontWeight: 200, color: "#fff",
            lineHeight: 1, letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </span>
        )}

      <span style={{
        fontSize: 11, fontWeight: 400,
        color: "rgba(255,255,255,0.28)",
        lineHeight: 1.4,
      }}>
        {unit}
      </span>
    </div>
  );
}

export function ProductionPanel({ insights, maquinas, maquinasLoading }: Props) {
  const today = new Date()
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".");

  const maxTotal = maquinas[0]?.total || 1;
  const machines = maquinas.slice(0, 6);

  return (
    <div style={{
      background: "linear-gradient(160deg, hsl(var(--sidebar-background)) 0%, hsl(var(--sidebar-accent)) 50%, hsl(var(--sidebar-background)) 100%)",
      position: "relative", overflow: "hidden",
    }}>

      {/* Dot grid */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(61,160,106,0.07) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Glow top-right */}
      <div aria-hidden style={{
        position: "absolute", top: -120, right: -80,
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(61,160,106,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Eyebrow ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "22px 32px 0",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-block", width: 6, height: 6,
            borderRadius: "50%", background: "#5dc287",
            boxShadow: "0 0 6px rgba(93,194,135,0.7)",
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: "rgba(93,194,135,0.6)",
            letterSpacing: "0.2em", textTransform: "uppercase",
          }}>
            Produção
          </span>
        </div>
        <span style={{
          fontSize: 10.5,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          {today}
        </span>
      </div>

      {/* ── Three stat columns ── */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        marginTop: 18,
        position: "relative",
      }}>
        <StatCol
          label="Total hoje"
          value={insights.producaoHoje}
          unit="peças conformes"
          accent
          loading={insights.loading}
        />
        <div style={{ width: 1, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
        <StatCol
          label="Esta semana"
          value={insights.totalEstaSemana}
          unit="peças acumuladas"
          loading={insights.loading}
        />
        <div style={{ width: 1, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
        <StatCol
          label="NCs hoje"
          value={insights.topMaquinaNcHojeTotal === 0 ? "—" : insights.topMaquinaNcHojeTotal}
          unit={insights.topMaquinaNcHoje ?? "nenhuma ocorrência"}
          loading={insights.loading}
        />
      </div>

      {/* ── Machine bars ── */}
      <div style={{ padding: "24px 32px 28px", position: "relative" }}>
        <span style={{
          display: "block", marginBottom: 18,
          fontSize: 9.5, fontWeight: 700,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.18em", textTransform: "uppercase",
        }}>
          Produção diária por máquina
        </span>

        {maquinasLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[75, 55, 85, 45, 65].map((w, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Skel w={`${w}%`} h={10} />
                <Skel w="100%" h={3} />
              </div>
            ))}
          </div>
        ) : machines.length === 0 ? (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            Sem registros hoje.
          </span>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {machines.map(m => {
              const pct = Math.round((m.total / maxTotal) * 100);
              return (
                <li key={m.maquina}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", marginBottom: 7,
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: "rgba(255,255,255,0.65)",
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", flex: 1, marginRight: 16,
                    }}>
                      {m.maquina}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, flexShrink: 0,
                      color: "rgba(93,194,135,0.85)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {m.total.toLocaleString("pt-BR")} un
                    </span>
                  </div>
                  <div style={{
                    height: 3,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 99, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--sidebar-primary)) 100%)",
                      borderRadius: 99,
                      transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
