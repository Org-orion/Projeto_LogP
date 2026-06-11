"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const VERDE = "#1f4d34";
const MUTED = "#6b7a72";
const LINE  = "#e4e7e4";

interface FeedRow {
  id: number | string;
  hora: string;
  maquina: string;
  produto: string;
  qtdConforme: number;
  conformidade: number | null;
  isNew: boolean;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcConf(conf: number, nc1: number, nc2: number, nc3: number, nc4: number): number | null {
  const total = conf + nc1 + nc2 + nc3 + nc4;
  return total === 0 ? null : Math.round((conf / total) * 100);
}

function rowFromRecord(r: Record<string, unknown>, isNew = false): FeedRow {
  return {
    id: r.id as number,
    hora: r.hora_inicial ? String(r.hora_inicial).slice(0, 5) : "--:--",
    maquina: (r.maquina as string) ?? "—",
    produto: (r.produto as string) ?? "—",
    qtdConforme: (r.qtd_conforme as number) ?? 0,
    conformidade: calcConf(
      (r.qtd_conforme as number) ?? 0,
      (r.qtd_nao_conforme_1 as number) ?? 0,
      (r.qtd_nao_conforme_2 as number) ?? 0,
      (r.qtd_nao_conforme_3 as number) ?? 0,
      (r.qtd_nao_conforme_4 as number) ?? 0,
    ),
    isNew,
  };
}

async function fetchRows(): Promise<FeedRow[]> {
  const { data, error } = await supabase
    .from("registros_producao")
    .select("id,hora_inicial,maquina,produto,qtd_conforme,qtd_nao_conforme_1,qtd_nao_conforme_2,qtd_nao_conforme_3,qtd_nao_conforme_4")
    .eq("data", todayStr())
    .order("hora_inicial", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data.map(r => rowFromRecord(r as Record<string, unknown>));
}

function ConfBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ fontSize: 11, color: MUTED }}>—</span>;
  const [color, bg] =
    pct >= 98 ? ["#16a34a", "rgba(22,163,74,0.08)"] :
    pct >= 90 ? ["#d97706", "rgba(217,119,6,0.08)"]  :
                ["#dc2626", "rgba(220,38,38,0.08)"];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: bg,
      padding: "2px 8px", borderRadius: 99,
      fontVariantNumeric: "tabular-nums",
    }}>
      {pct}%
    </span>
  );
}

function SkeletonRows() {
  const widths = [
    [130, 90], [160, 70], [110, 100], [145, 80],
  ];
  return (
    <div style={{ padding: "8px 0" }}>
      {widths.map(([w1, w2], i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "52px 1fr 1fr 64px 56px",
          gap: "0 16px", padding: "13px 20px", alignItems: "center",
          borderBottom: i < widths.length - 1 ? `1px solid ${LINE}` : undefined,
        }}>
          <div className="animate-pulse" style={{ height: 12, width: 32, background: LINE, borderRadius: 4 }} />
          <div className="animate-pulse" style={{ height: 12, width: w1, background: LINE, borderRadius: 4 }} />
          <div className="animate-pulse" style={{ height: 12, width: w2, background: LINE, borderRadius: 4 }} />
          <div className="animate-pulse" style={{ height: 12, width: 40, background: LINE, borderRadius: 4, marginLeft: "auto" }} />
          <div className="animate-pulse" style={{ height: 18, width: 36, background: LINE, borderRadius: 99, marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function LiveFeed() {
  const [rows, setRows]       = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef          = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    fetchRows().then(data => {
      if (!cancelledRef.current) { setRows(data); setLoading(false); }
    });

    const channel = supabase
      .channel("livefeed-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registros_producao" },
        (payload) => {
          if (cancelledRef.current) return;
          const rec = payload.new as Record<string, unknown>;
          if ((rec.data as string) !== todayStr()) return;

          const newRow = rowFromRecord(rec, true);
          setRows(prev => [newRow, ...prev].slice(0, 8));

          setTimeout(() => {
            if (!cancelledRef.current)
              setRows(prev => prev.map(r => r.id === newRow.id ? { ...r, isNew: false } : r));
          }, 2000);
        },
      )
      .subscribe();

    return () => {
      cancelledRef.current = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ background: "#fff" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 20px",
        borderBottom: `1px solid ${LINE}`,
        background: "linear-gradient(180deg, #f8faf8 0%, #fff 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
              <span className="live-ping" style={{
                position: "absolute", inset: 0, borderRadius: "50%", background: "#16a34a",
              }} />
              <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "block" }} />
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#16a34a", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Ao vivo
            </span>
          </span>
          <span style={{ width: 1, height: 13, background: LINE, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
            Registros de produção — hoje
          </span>
        </div>
        {!loading && (
          <span style={{ fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
            {rows.length} {rows.length === 1 ? "entrada" : "entradas"}
          </span>
        )}
      </div>

      {/* ── Column headers ── */}
      {!loading && rows.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "52px 1fr 1fr 64px 56px",
          gap: "0 16px", padding: "7px 20px",
          borderBottom: `1px solid ${LINE}`,
          background: "#fafbfa",
        }}>
          {["Hora", "Máquina", "Produto", "Qtde", "Conf."].map((h, i) => (
            <span key={h} style={{
              fontSize: 9.5, fontWeight: 700, color: "#9ca3af",
              letterSpacing: "0.1em", textTransform: "uppercase",
              textAlign: i >= 3 ? "right" : "left",
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* ── Rows ── */}
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div style={{ padding: "44px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
          Nenhum registro lançado hoje.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={row.isNew ? "feed-row-new" : undefined}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 1fr 64px 56px",
                gap: "0 16px",
                alignItems: "center",
                padding: "13px 20px",
                borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : undefined,
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 600, color: MUTED,
                fontVariantNumeric: "tabular-nums",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {row.hora}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: VERDE,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {row.maquina}
              </span>
              <span style={{
                fontSize: 12, color: MUTED,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {row.produto}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: VERDE,
                textAlign: "right", fontVariantNumeric: "tabular-nums",
              }}>
                {row.qtdConforme.toLocaleString("pt-BR")}&thinsp;un
              </span>
              <div style={{ textAlign: "right" }}>
                <ConfBadge pct={row.conformidade} />
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
