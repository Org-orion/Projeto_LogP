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
const ROW_H        = 44;
const BLOCK_H      = 22;
const LABEL_W      = 200;
const BASE_PX_MIN  = 2;   // pixels por minuto na escala base
const ZOOM_STEPS   = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const DEFAULT_ZOOM = 6;   // índice em ZOOM_STEPS

const LINE  = "hsl(var(--border))";
const MUTED = "hsl(var(--muted-foreground))";
const TICK  = "hsl(var(--muted-foreground))";
const TRACK = "hsl(var(--muted))";
const TITLE = "hsl(var(--primary))";

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
      <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: "0 0 2px", letterSpacing: "0.01em" }}>
        {tt.maquina}
      </p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 10px" }}>
        {tt.produto}
      </p>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5dc287", lineHeight: 1 }}>● andamento</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>fim</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{tt.horaFim}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>fim</div>
            </>
          )}
        </div>
      </div>
      {tt.qtd > 0 && (
        <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: "rgba(93,194,135,0.85)", fontVariantNumeric: "tabular-nums" }}>
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
      <div style={{ display: "flex", marginBottom: 8, paddingLeft: LABEL_W }}>
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
        <div key={ri} style={{ display: "flex", alignItems: "center", height: ROW_H, borderBottom: `1px solid ${LINE}` }}>
          <div className="animate-pulse" style={{ width: LABEL_W, height: 10, marginRight: 20, background: TRACK, borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", height: ROW_H }}>
            {blocks.map((b, bi) => (
              <div key={bi} className="animate-pulse" style={{
                position: "absolute",
                left: `${b.l}%`, width: `${b.w}%`,
                top: "50%", transform: "translateY(-50%)",
                height: BLOCK_H, background: "rgba(33,108,59,0.1)", borderRadius: 4,
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Zoom button ──────────────────────────────────────────────────────────────

function ZoomBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 24, height: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "none",
        border: `1px solid ${LINE}`,
        borderRadius: 5, cursor: disabled ? "default" : "pointer",
        fontSize: 14, fontWeight: 700,
        color: disabled ? TRACK : TITLE,
        lineHeight: 1, padding: 0,
        transition: "background 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(26,92,53,0.07)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
    >
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MachineTimeline() {
  const [rows, setRows]         = useState<MachineRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tooltip, setTooltip]   = useState<TooltipState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoomIdx, setZoomIdx]   = useState(DEFAULT_ZOOM);
  const cancelledRef            = useRef(false);
  const scrollRef               = useRef<HTMLDivElement>(null);

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

  const now      = nowMins();
  const pxPerMin = BASE_PX_MIN * ZOOM_STEPS[zoomIdx];

  let rangeStart = 7 * 60;
  const rangeEnd = Math.ceil((now + 15) / 30) * 30;

  if (rows.length > 0) {
    const allStarts = rows.flatMap(r => r.blocks.map(b => b.startMin));
    rangeStart = Math.floor((Math.min(...allStarts) - 15) / 30) * 30;
  }

  const span       = rangeEnd - rangeStart;
  const trackWidth = span * pxPerMin;
  const nowPx      = Math.min(trackWidth, Math.max(0, (now - rangeStart) * pxPerMin));

  // Rola até o horário atual sempre que os dados carregam ou o zoom muda
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const container    = scrollRef.current;
      const visibleWidth = container.clientWidth;
      // Posiciona o "agora" a ~65% da largura visível
      // LABEL_W não é somado pois a coluna de labels está fora do scroll container
      container.scrollLeft = Math.max(0, nowPx - visibleWidth * 0.65);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, zoomIdx]);

  const ticks: number[] = [];
  for (let m = Math.ceil(rangeStart / 60) * 60; m <= rangeEnd; m += 60) ticks.push(m);

  return (
    <div style={{ background: "hsl(var(--card))", position: "relative", overflow: "visible", fontFamily: "inherit" }}>

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
        background: "hsl(var(--card))",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#16a34a", display: "inline-block",
            boxShadow: "0 0 6px rgba(22,163,74,0.5)",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: TITLE }}>
            Hora-Máquina
          </span>
          <span style={{ width: 1, height: 12, background: LINE }} />
          <span style={{ fontSize: 11, color: MUTED }}>Blocos de produção · hoje</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Legenda */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 20, height: 2, background: "rgba(22,163,74,0.35)", borderRadius: 99, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: TICK }}>agora</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5dc287", display: "inline-block" }} className="animate-pulse" />
            <span style={{ fontSize: 11, color: TICK }}>em andamento</span>
          </div>

          <span style={{ width: 1, height: 16, background: LINE, marginLeft: 4 }} />

          {/* Zoom controls */}
          <ZoomBtn label="−" onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0} />
          <span style={{ fontSize: 10, color: MUTED, minWidth: 32, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
            {ZOOM_STEPS[zoomIdx]}×
          </span>
          <ZoomBtn label="+" onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIdx === ZOOM_STEPS.length - 1} />

          <span style={{ width: 1, height: 16, background: LINE, marginLeft: 4 }} />

          <span style={{ fontSize: 10.5, color: TICK, fontFamily: "'JetBrains Mono', monospace" }}>
            {minsToHHMM(now)}
          </span>
        </div>
      </div>

      {loading && <SkeletonTimeline />}

      {!loading && rows.length === 0 && (
        <div style={{ padding: "40px 24px", textAlign: "center", color: MUTED, fontSize: 13 }}>
          Nenhum registro com hora lançada hoje.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ padding: "0 0 18px", position: "relative" }}>

          <div style={{ display: "flex", paddingLeft: 24 }}>

            {/* Coluna fixa de labels — fora do scroll */}
            <div style={{ width: LABEL_W, flexShrink: 0 }}>
              <div style={{ height: 26 }} />
              {visibleRows.map(row => (
                <div key={row.maquina} style={{
                  height: ROW_H,
                  display: "flex", alignItems: "center",
                  borderTop: `1px solid ${LINE}`,
                  paddingRight: 12,
                  fontSize: 11, fontWeight: 500, color: "hsl(var(--foreground))",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {row.maquina}
                </div>
              ))}
              <div style={{ height: 1, background: LINE }} />
            </div>

            {/* Tracks — scrollável */}
            <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", paddingRight: 24 }}>
              <div style={{ width: trackWidth, minWidth: "100%", position: "relative" }}>

                {/* Eixo de horas */}
                <div style={{ height: 26, position: "relative" }}>
                  {ticks.map(t => (
                    <span key={t} style={{
                      position: "absolute",
                      left: (t - rangeStart) * pxPerMin,
                      transform: "translateX(-50%)",
                      fontSize: 9.5, color: TICK,
                      fontFamily: "'JetBrains Mono', monospace",
                      userSelect: "none", whiteSpace: "nowrap",
                    }}>
                      {minsToHHMM(t)}
                    </span>
                  ))}
                </div>

                {/* Linhas de máquina */}
                {visibleRows.map((row) => {
                  const color = BLOCK_COLORS[row.colorIdx];
                  return (
                    <div key={row.maquina} style={{
                      height: ROW_H, position: "relative",
                      borderTop: `1px solid ${LINE}`,
                    }}>
                      {/* Linhas verticais de hora */}
                      {ticks.map(t => (
                        <div key={t} aria-hidden style={{
                          position: "absolute",
                          left: (t - rangeStart) * pxPerMin,
                          top: 0, bottom: 0, width: 1,
                          background: LINE, pointerEvents: "none",
                        }} />
                      ))}

                      {/* Baseline */}
                      <div style={{
                        position: "absolute", left: 0, right: 0,
                        top: "50%", transform: "translateY(-50%)",
                        height: 2, background: TRACK, borderRadius: 99, pointerEvents: "none",
                      }} />

                      {/* Marcador agora */}
                      <div aria-hidden style={{
                        position: "absolute", left: nowPx,
                        top: 4, bottom: 4, width: 1,
                        background: "rgba(22,163,74,0.35)", pointerEvents: "none",
                      }} />

                      {/* Blocos */}
                      {row.blocks.map(block => {
                        const leftPx  = (block.startMin - rangeStart) * pxPerMin;
                        const widthPx = Math.max(4, (block.endMin - block.startMin) * pxPerMin);
                        if (leftPx + widthPx < 0 || leftPx > trackWidth) return null;
                        return (
                          <div
                            key={block.id}
                            style={{
                              position: "absolute",
                              left: leftPx, width: widthPx,
                              top: "50%", transform: "translateY(-50%)",
                              height: BLOCK_H,
                              background: `linear-gradient(90deg, ${color}dd, ${color})`,
                              borderRadius: 4, cursor: "default",
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
                            {widthPx > 28 && block.qtd > 0 && (
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
                  );
                })}

                <div style={{ height: 1, background: LINE }} />
              </div>
            </div>
          </div>

          {/* Ver mais / Ver menos */}
          <div style={{ paddingLeft: 24, paddingRight: 24 }}>
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
                {expanded ? "↑ Ver menos" : `↓ Ver mais (${hiddenCount} máquina${hiddenCount > 1 ? "s" : ""})`}
              </button>
            )}
          </div>
        </div>
      )}

      {tooltip && typeof document !== "undefined" && createPortal(<Tooltip tt={tooltip} />, document.body)}
    </div>
  );
}
