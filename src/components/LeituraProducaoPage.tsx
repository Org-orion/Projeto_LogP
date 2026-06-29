"use client";

import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Gauge, Thermometer, Package, Ruler, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useLeituraProducao, type LeituraProducao } from "@/hooks/useLeituraProducao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SpinnerCustom } from "@/components/ui/spinner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null, dec = 0) {
  if (v === null || v === undefined) return <span style={{ color: "rgba(var(--muted-foreground))" }}>—</span>;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtTs(ts: string) {
  try {
    return format(parseISO(ts), "dd/MM HH:mm:ss", { locale: ptBR });
  } catch {
    return ts;
  }
}

function nomeMaquina(l: LeituraProducao) {
  return l.maquina_nome ?? l.maquina_id ?? <span style={{ opacity: 0.4 }}>—</span>;
}

// ─── Live indicator ───────────────────────────────────────────────────────────

function LiveDot({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: active ? "#22c55e" : "#ef4444",
        boxShadow: active ? "0 0 0 0 rgba(34,197,94,0.4)" : "none",
        animation: active ? "pulse-ring 1.4s ease-out infinite" : "none",
      }} />
      {active ? "Ao vivo" : "Desconectado"}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  unit?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, display: "grid", placeItems: "center",
        }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", margin: 0 }}>{label}</p>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {value}{unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3, opacity: 0.6 }}>{unit}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LeituraProducaoPage() {
  const { leituras, loading, error } = useLeituraProducao(200);
  const [isLive, setIsLive]     = useState(true);
  const [newIds, setNewIds]     = useState<Set<number>>(new Set());
  const prevIdsRef              = useRef<Set<number>>(new Set());
  const [filtroMaquina, setFiltroMaquina] = useState<string>("todas");

  // Detect new rows for highlight animation
  useEffect(() => {
    if (leituras.length === 0) return;
    const incoming = new Set(leituras.map(l => l.id));
    const fresh = new Set([...incoming].filter(id => !prevIdsRef.current.has(id)));
    if (prevIdsRef.current.size > 0 && fresh.size > 0) {
      setIsLive(true);
      setNewIds(fresh);
      const t = setTimeout(() => setNewIds(new Set()), 2000);
      return () => clearTimeout(t);
    }
    prevIdsRef.current = incoming;
  }, [leituras]);

  // Detect disconnection (no new rows in 60s)
  useEffect(() => {
    const t = setTimeout(() => setIsLive(false), 60_000);
    return () => clearTimeout(t);
  }, [leituras]);

  // Máquinas distintas para filtro
  const maquinas = [...new Set(
    leituras.map(l => l.maquina_nome ?? l.maquina_id ?? "")
  )].filter(Boolean).sort();

  const leiturasFiltradas = filtroMaquina === "todas"
    ? leituras
    : leituras.filter(l => (l.maquina_nome ?? l.maquina_id) === filtroMaquina);

  // KPIs da leitura mais recente (por máquina filtrada)
  const latest = leiturasFiltradas[0] ?? null;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <SpinnerCustom />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#ef4444" }}>
        <WifiOff size={32} style={{ margin: "0 auto 12px" }} />
        <p style={{ fontWeight: 600 }}>Erro ao carregar leituras</p>
        <p style={{ fontSize: 13, opacity: 0.7 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Leituras em Tempo Real</h2>
          <p style={{ fontSize: 12, margin: "2px 0 0", color: "hsl(var(--muted-foreground))" }}>
            Monitoramento contínuo das máquinas via sensores
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Filtro máquina */}
          {maquinas.length > 1 && (
            <select
              value={filtroMaquina}
              onChange={e => setFiltroMaquina(e.target.value)}
              style={{
                fontSize: 12.5, padding: "6px 10px", borderRadius: 7,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))", color: "hsl(var(--foreground))",
                cursor: "pointer",
              }}
            >
              <option value="todas">Todas as máquinas</option>
              {maquinas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <Badge
            variant="outline"
            style={{
              fontSize: 11.5, padding: "4px 10px", borderRadius: 999,
              borderColor: isLive ? "#22c55e55" : "#ef444455",
              color: isLive ? "#22c55e" : "#ef4444",
              background: isLive ? "#22c55e10" : "#ef444410",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <LiveDot active={isLive} />
          </Badge>
          <Badge variant="secondary" style={{ fontSize: 11.5 }}>
            <RefreshCw size={11} style={{ marginRight: 4 }} />
            {leiturasFiltradas.length} leituras
          </Badge>
        </div>
      </div>

      {/* ── KPIs da leitura mais recente ── */}
      {latest && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          <KpiCard icon={Gauge}       label="Velocidade atual"  value={fmt(latest.velocidade, 1)}   unit="m/min" color="#3b82f6" />
          <KpiCard icon={Package}     label="Qtd peças (total)" value={fmt(latest.qtd_pecas)}       unit="un"    color="#22c55e" />
          <KpiCard icon={Ruler}       label="Metros lineares"   value={fmt(latest.metros_lineares)} unit="m"     color="#a855f7" />
          <KpiCard icon={Clock}       label="Tempo trabalhado"  value={`${latest.horas_trabalhadas ?? 0}h ${latest.minutos_trabalhados ?? 0}m`} color="#f59e0b" />
          {latest.temperatura !== null && (
            <KpiCard icon={Thermometer} label="Temperatura"     value={fmt(latest.temperatura, 1)}  unit="°C"    color="#ef4444" />
          )}
        </div>
      )}

      {leiturasFiltradas.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "hsl(var(--muted-foreground))" }}>
          <Activity size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Nenhuma leitura encontrada</p>
        </div>
      )}

      {/* ── Tabela ao vivo ── */}
      {leiturasFiltradas.length > 0 && (
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
              <Activity size={15} style={{ color: "#22c55e" }} />
              Histórico de leituras
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ minWidth: 130 }}>Coletado em</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Velocidade</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Qtd peças</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Metros lin.</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Temp.</TableHead>
                    <TableHead style={{ textAlign: "right" }}>H. trabalhadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leiturasFiltradas.map(l => {
                    const isNew = newIds.has(l.id);
                    return (
                      <TableRow
                        key={l.id}
                        style={{
                          transition: "background 0.6s",
                          background: isNew ? "rgba(34,197,94,0.08)" : undefined,
                        }}
                      >
                        <TableCell style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {fmtTs(l.coletado_em)}
                        </TableCell>
                        <TableCell style={{ fontSize: 12 }}>
                          {nomeMaquina(l)}
                        </TableCell>
                        <TableCell style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          {l.velocidade !== null ? <>{fmt(l.velocidade, 1)} <span style={{ opacity: 0.5, fontSize: 10 }}>m/min</span></> : <span style={{ opacity: 0.35 }}>—</span>}
                        </TableCell>
                        <TableCell style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(l.qtd_pecas)}
                        </TableCell>
                        <TableCell style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          {l.metros_lineares !== null ? <>{fmt(l.metros_lineares)} <span style={{ opacity: 0.5, fontSize: 10 }}>m</span></> : <span style={{ opacity: 0.35 }}>—</span>}
                        </TableCell>
                        <TableCell style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          {l.temperatura !== null ? <>{fmt(l.temperatura, 1)} <span style={{ opacity: 0.5, fontSize: 10 }}>°C</span></> : <span style={{ opacity: 0.35 }}>—</span>}
                        </TableCell>
                        <TableCell style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          {l.horas_trabalhadas !== null ? `${l.horas_trabalhadas}h ${l.minutos_trabalhados ?? 0}m` : <span style={{ opacity: 0.35 }}>—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}
