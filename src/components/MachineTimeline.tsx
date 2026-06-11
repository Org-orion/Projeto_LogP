"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Block {
  id: number | string;
  startMin: number;
  endMin: number;
  running: boolean;
  qtd: number;
  produto: string;
  horaIni: string;
  horaFim: string | null;
}

interface MachineRow {
  maquina: string;
  colorIdx: number;
  blocks: Block[];
}

interface TooltipState {
  x: number; y: number;
  horaIni: string; horaFim: string | null;
  qtd: number; produto: string; running: boolean;
  maquina: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCK_COLORS = [
  "#216C3B", "#2d8a4e", "#1a6b5e", "#15803d",
  "#0f766e", "#166534", "#065f46", "#3d6b21",
];
const ROW_H   = 44;
const BLOCK_H = 22;

// Light theme tokens
const LINE  = "#eaeceb";
const MUTED = "#6b7a72";
const TICK  = "#9ca3af";
const TRACK = "#e4e7e4";
const TITLE = "#1a5c35";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMins(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (isNaN(m) ? 0 : m);
}

function minsToHHMM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function nowMins() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface RawRow {
  id: number;
  hora_inicial: string | null;
  hora_final: string | null;
  maquina: string | null;
  produto: string | null;
  qtd_conforme: number | null;
}

function buildRows(data: RawRow[]): MachineRow[] {
  const now = nowMins();
  const machineMap = new Map<string, Block[]>();
  const machineOrder: string[] = [];

  for (const row of data) {
    if (!row.hora_inicial) continue;
    const maquina  = row.maquina ?? "Desconhecida";
    const startMin = timeToMins(row.hora_inicial) ?? 0;
    const rawEnd   = timeToMins(row.hora_final);
    const running  = rawEnd === null;
    const endMin   = rawEnd !== null ? rawEnd : now;

    if (!machineMap.has(maquina)) {
      machineMap.set(maquina, []);
      machineOrder.push(maquina);
    }
    machineMap.get(maquina)!.push({
      id: row.id,
      startMin, endMin, running,
      qtd: row.qtd_conforme ?? 0,
      produto: row.produto ?? "—",
      horaIni: row.hora_inicial.slice(0, 5),
      horaFim: row.hora_final ? row.hora_final.slice(0, 5) : null,
    });
  }

  return machineOrder.map((maquina, idx) => ({
    maquina,
    colorIdx: idx % BLOCK_COLORS.length,
    blocks: machineMap.get(maquina)!,
  }));
}

async function fetchData(): Promise<MachineRow[]> {
  const { data, error } = await supabase
    .from("registros_producao")
    .select("id,hora_inicial,hora_final,maquina,produto,qtd_conforme")
    .eq("data", todayStr())
    .not("hora_inicial", "is", null)
    .order("hora_inicial", { ascending: true });

  if (error || !data) return [];
  return buildRows(data as RawRow[]);
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ tt }: { tt: TooltipState }) {
  return (
    <div style={{
      position: "fixed",
      left: tt.x + 10, top: tt.y + 14,
      background: "#0f2419",
      border: "1px solid rgba(61,160,106,0.2)",
      borderRadius: 10, padding: "12px 16px",
      pointerEvents: "none", zIndex: 1000,
      minWidth: 200,
      boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
    }}>
      {/* Machine + product */}
      <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: "0 0 2px", letterSpacing: "0.01em" }}>
        {tt.maquina}
      </p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 10px" }}>
        {tt.produto}
      </p>

      {/* Time range — destaque principal */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(61,160,106,0.1)",
        border: "1px solid rgba(61,160,106,0.18)",
        borderRadius: 6, padding: "7px 10px",
        marginBottom: tt.qtd > 0 ? 8 : 0,
      }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {tt.horaIni}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            início
          </div>
        </div>
        <div style={{ fontSize: 14, color: "rgba(93,194,135,0.5)", flexShrink: 0 }}>→</div>
        <div style={{ textAlign: "center", flex: 1 }}>
          {tt.running ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5dc287", lineHeight: 1 }}>
                ● andamento
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                fim
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {tt.horaFim}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                fim
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quantity */}
      {tt.qtd > 0 && (
        <p style={{
          fontSize: 11, fontWeight: 600, margin: 0,
          color: "rgba(93,194,135,0.85)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {tt.qtd.toLocaleString("pt-BR")} unidades produzidas
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonTimeline() {
  const skRows = [
    [{ l: 10, w: 22 }, { l: 42, w: 16 }],
    [{ l: 5,  w: 30 }, { l: 48, w: 20 }],
    [{ l: 18, w: 18 }, { l: 45, w: 14 }, { l: 68, w: 10 }],
    [{ l: 25, w: 26 }],
    [{ l: 8,  w: 20 }, { l: 38, w: 24 }],
  ];
  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ display: "flex", marginBottom: 8, paddingLeft: 148 }}>
        {[0, 20, 40, 60, 80, 100].map(pct => (
          <div key={pct} className="animate-pulse" style={{
            position: "relative", left: `${pct}%`,
            height: 8, width: 28,
            background: TRACK, borderRadius: 4,
            marginRight: pct < 100 ? "auto" : 0,
          }} />
        ))}
      </div>
      {skRows.map((blocks, ri) => (
        <div key={ri} style={{
          display: "flex", alignItems: "center",
          height: ROW_H, borderBottom: `1px solid ${LINE}`,
        }}>
          <div className="animate-pulse" style={{
            width: 128, height: 10, marginRight: 20,
            background: TRACK, borderRadius: 4, flexShrink: 0,
          }} />
          <div style={{ flex: 1, position: "relative", height: ROW_H }}>
            {blocks.map((b, bi) => (
              <div key={bi} className="animate-pulse" style={{
                position: "absolute",
                left: `${b.l}%`, width: `${b.w}%`,
                top: "50%", transform: "translateY(-50%)",
                height: BLOCK_H,
                background: "rgba(33,108,59,0.1)",
                borderRadius: 4,
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MachineTimeline() {
  const [rows, setRows]       = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const cancelledRef            = useRef(false);

  const LIMIT       = 10;
  const hiddenCount = Math.max(0, rows.length - LIMIT);
  const visibleRows = expanded ? rows : rows.slice(0, LIMIT);

  useEffect(() => {
    cancelledRef.current = false;

    fetchData().then(data => {
      if (!cancelledRef.current) { setRows(data); setLoading(false); }
    });

    const channel = supabase
      .channel("timeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_producao" }, () => {
        fetchData().then(data => { if (!cancelledRef.current) setRows(data); });
      })
      .subscribe();

    return () => { cancelledRef.current = true; supabase.removeChannel(channel); };
  }, []);

  const now  = nowMins();

  let rangeStart = 7 * 60;
  let rangeEnd   = Math.max(17 * 60, now + 30);

  if (rows.length > 0) {
    const allStarts = rows.flatMap(r => r.blocks.map(b => b.startMin));
    const allEnds   = rows.flatMap(r => r.blocks.map(b => b.endMin));
    rangeStart = Math.floor((Math.min(...allStarts) - 15) / 30) * 30;
    rangeEnd   = Math.ceil((Math.max(...allEnds, now) + 15) / 30) * 30;
  }

  const span   = rangeEnd - rangeStart;
  const nowPct = Math.min(100, Math.max(0, ((now - rangeStart) / span) * 100));

  const ticks: number[] = [];
  for (let m = Math.ceil(rangeStart / 60) * 60; m <= rangeEnd; m += 60) ticks.push(m);

  return (
    <div style={{ background: "#fff", position: "relative", overflow: "visible", fontFamily: "inherit" }}>

      {/* Dot grid sutil */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
        backgroundImage: "radial-gradient(circle, rgba(33,108,59,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px 12px",
        borderBottom: `1px solid ${LINE}`,
        background: "linear-gradient(180deg, #f8faf8 0%, #fff 100%)",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#16a34a", display: "inline-block",
            boxShadow: "0 0 6px rgba(22,163,74,0.5)",
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: TITLE,
          }}>
            Hora-Máquina
          </span>
          <span style={{ width: 1, height: 12, background: LINE }} />
          <span style={{ fontSize: 11, color: MUTED }}>
            Blocos de produção · hoje
          </span>
        </div>
        <span style={{
          fontSize: 10.5, color: TICK,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {minsToHHMM(now)}
        </span>
      </div>

      {loading && <SkeletonTimeline />}

      {!loading && rows.length === 0 && (
        <div style={{ padding: "40px 24px", textAlign: "center", color: MUTED, fontSize: 13 }}>
          Nenhum registro com hora lançada hoje.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ padding: "0 24px 18px", position: "relative" }}>

          {/* Hour axis */}
          <div style={{ display: "flex", alignItems: "center", height: 26, marginBottom: 0 }}>
            <div style={{ width: 148, flexShrink: 0 }} />
            <div style={{ flex: 1, position: "relative" }}>
              {ticks.map(t => (
                <span key={t} style={{
                  position: "absolute",
                  left: `${((t - rangeStart) / span) * 100}%`,
                  transform: "translateX(-50%)",
                  fontSize: 9.5, color: TICK,
                  fontFamily: "'JetBrains Mono', monospace",
                  userSelect: "none", whiteSpace: "nowrap",
                }}>
                  {minsToHHMM(t)}
                </span>
              ))}
            </div>
          </div>

          {/* Machine rows */}
          {visibleRows.map((row, ri) => {
            const color = BLOCK_COLORS[row.colorIdx];
            return (
              <div
                key={row.maquina}
                style={{
                  display: "flex", alignItems: "center",
                  borderTop: `1px solid ${LINE}`,
                }}
              >
                {/* Machine label */}
                <div style={{
                  width: 148, flexShrink: 0, paddingRight: 16,
                  fontSize: 11, fontWeight: 500, color: "#374151",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {row.maquina}
                </div>

                {/* Track */}
                <div style={{ flex: 1, height: ROW_H, position: "relative" }}>

                  {/* Vertical hour lines */}
                  {ticks.map(t => (
                    <div key={t} aria-hidden style={{
                      position: "absolute",
                      left: `${((t - rangeStart) / span) * 100}%`,
                      top: 0, bottom: 0, width: 1,
                      background: LINE, pointerEvents: "none",
                    }} />
                  ))}

                  {/* Track baseline */}
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    top: "50%", transform: "translateY(-50%)",
                    height: 2, background: TRACK,
                    borderRadius: 99, pointerEvents: "none",
                  }} />

                  {/* Now marker */}
                  <div aria-hidden style={{
                    position: "absolute",
                    left: `${nowPct}%`,
                    top: 4, bottom: 4, width: 1,
                    background: "rgba(22,163,74,0.35)",
                    pointerEvents: "none",
                  }} />

                  {/* Blocks */}
                  {row.blocks.map(block => {
                    const leftPct  = ((block.startMin - rangeStart) / span) * 100;
                    const widthPct = ((block.endMin - block.startMin) / span) * 100;
                    if (leftPct + widthPct < 0 || leftPct > 100) return null;

                    const clampedLeft  = Math.max(0, leftPct);
                    const clampedWidth = Math.min(100 - clampedLeft, widthPct);

                    return (
                      <div
                        key={block.id}
                        style={{
                          position: "absolute",
                          left: `${clampedLeft}%`, width: `${clampedWidth}%`,
                          top: "50%", transform: "translateY(-50%)",
                          height: BLOCK_H,
                          background: `linear-gradient(90deg, ${color}dd, ${color})`,
                          borderRadius: 4,
                          cursor: "default",
                          boxShadow: `0 1px 6px ${color}40`,
                          display: "flex", alignItems: "center",
                          overflow: "hidden",
                        }}
                        onMouseEnter={e => setTooltip({
                          x: e.clientX, y: e.clientY,
                          maquina: row.maquina,
                          horaIni: block.horaIni, horaFim: block.horaFim,
                          qtd: block.qtd, produto: block.produto, running: block.running,
                        })}
                        onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {clampedWidth > 6 && block.qtd > 0 && (
                          <span style={{
                            paddingLeft: 6, fontSize: 9.5, fontWeight: 600,
                            color: "rgba(255,255,255,0.9)",
                            whiteSpace: "nowrap", pointerEvents: "none",
                            fontVariantNumeric: "tabular-nums", flexShrink: 0,
                          }}>
                            {block.qtd.toLocaleString("pt-BR")} un
                          </span>
                        )}
                        {block.running && (
                          <span style={{
                            position: "absolute", right: 4,
                            top: "50%", transform: "translateY(-50%)",
                            width: 6, height: 6, borderRadius: "50%",
                            background: "#5dc287",
                            boxShadow: "0 0 6px rgba(93,194,135,0.9)",
                          }} className="animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom border */}
          <div style={{ height: 1, background: LINE }} />

          {/* Ver mais / Ver menos */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                marginTop: 10, padding: "6px 12px",
                background: "none", border: `1px solid ${LINE}`,
                borderRadius: 6, cursor: "pointer",
                fontSize: 11.5, fontWeight: 600, color: TITLE,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(26,92,53,0.05)";
                e.currentTarget.style.borderColor = "rgba(26,92,53,0.3)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.borderColor = LINE;
              }}
            >
              {expanded
                ? "↑ Ver menos"
                : `↓ Ver mais (${hiddenCount} máquina${hiddenCount > 1 ? "s" : ""})`}
            </button>
          )}

          {/* Legend */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 16, paddingTop: hiddenCount > 0 ? 6 : 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 20, height: 2, background: "rgba(22,163,74,0.35)", borderRadius: 99, display: "inline-block" }} />
              <span style={{ fontSize: 9.5, color: TICK }}>agora</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5dc287", display: "inline-block" }} className="animate-pulse" />
              <span style={{ fontSize: 9.5, color: TICK }}>em andamento</span>
            </div>
          </div>
        </div>
      )}

      {tooltip && typeof document !== "undefined" && createPortal(<Tooltip tt={tooltip} />, document.body)}
    </div>
  );
}
