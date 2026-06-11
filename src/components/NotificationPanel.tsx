"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, XCircle, CheckCheck, Link2 } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { useNcAlerts, type NcAlert } from "@/hooks/useNcAlerts";
import { useNfAlerts, type NfAlert } from "@/hooks/useNfAlerts";

const STORAGE_KEY = "logp_notif_lidas";

function getLidas(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveLidas(lidas: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...lidas]));
}

function formatDataLabel(dataStr: string): string {
  if (!dataStr) return "";
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dataStr === hoje) return "hoje";
  if (dataStr === ontem) return "ontem";
  const [, mm, dd] = dataStr.split("-");
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${Number(dd)} de ${meses[Number(mm) - 1]}`;
}

type UnifiedAlert =
  | { kind: "nc"; data: string; id: string; payload: NcAlert }
  | { kind: "nf"; data: string; id: string; payload: NfAlert };

interface NotificationPanelProps {
  onNavigateNC: () => void;
  onNavigateNF: () => void;
}

export function NotificationPanel({ onNavigateNC, onNavigateNF }: NotificationPanelProps) {
  const { data: ncAlerts = [], isLoading: ncLoading } = useNcAlerts();
  const { data: nfAlerts = [], isLoading: nfLoading } = useNfAlerts();
  const [lidas, setLidas] = useState<Set<string>>(getLidas);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unified: UnifiedAlert[] = [
    ...ncAlerts.map(a => ({ kind: "nc" as const, data: a.data, id: a.id, payload: a })),
    ...nfAlerts.map(a => ({ kind: "nf" as const, data: a.data, id: a.id, payload: a })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const isLoading = ncLoading || nfLoading;
  const unreadCount = unified.filter(a => !lidas.has(a.id)).length;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function marcarLida(id: string) {
    setLidas(prev => {
      const next = new Set(prev);
      next.add(id);
      saveLidas(next);
      return next;
    });
  }

  function marcarTodasLidas() {
    const next = new Set(unified.map(a => a.id));
    saveLidas(next);
    setLidas(next);
  }

  function handleClick(item: UnifiedAlert) {
    marcarLida(item.id);
    setOpen(false);
    if (item.kind === "nc") onNavigateNC();
    else onNavigateNF();
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="topnav-btn"
        style={{
          width: 36, height: 36, borderRadius: 8,
          display: "grid", placeItems: "center",
          color: open ? "#fff" : "rgba(255,255,255,0.75)",
          position: "relative", border: "none",
          background: open ? "rgba(255,255,255,0.1)" : "none",
          cursor: "pointer",
        }}
        title="Notificações"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 5, right: 5,
            minWidth: 16, height: 16, borderRadius: 8,
            background: "#ef4444",
            border: "2px solid #08301c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "#fff",
            lineHeight: 1, padding: "0 3px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 350, maxHeight: 520,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
          zIndex: 90,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid #f3f4f6",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={14} style={{ color: "#374151" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Notificações</span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  background: "#fef2f2", color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: 10, padding: "1px 7px",
                }}>
                  {unreadCount} {unreadCount === 1 ? "novo" : "novos"}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={marcarTodasLidas}
                style={{
                  fontSize: 11, color: "#6b7280", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 6px", borderRadius: 6,
                }}
              >
                <CheckCheck size={13} />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista unificada */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {isLoading ? (
              <div style={{ padding: "32px 16px", display: "flex", justifyContent: "center" }}>
                <SpinnerCustom />
              </div>
            ) : unified.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
                Nenhuma notificação pendente.
              </div>
            ) : (
              unified.map(item => {
                const lida = lidas.has(item.id);
                const isNc = item.kind === "nc";
                const nc = isNc ? (item.payload as NcAlert) : null;
                const nf = !isNc ? (item.payload as NfAlert) : null;

                const accentColor  = isNc ? "#dc2626" : "#d97706";
                const bgUnread     = isNc ? "#fef2f2" : "#fffbeb";
                const iconBgUnread = isNc ? "#fee2e2" : "#fef3c7";
                const dotColor     = isNc ? "#dc2626" : "#f59e0b";

                return (
                  <AlertItem
                    key={item.id}
                    lida={lida}
                    accentColor={accentColor}
                    bgUnread={bgUnread}
                    iconBgUnread={iconBgUnread}
                    dotColor={dotColor}
                    icon={isNc
                      ? <XCircle size={16} style={{ color: lida ? "#9ca3af" : accentColor }} />
                      : <Link2   size={16} style={{ color: lida ? "#9ca3af" : accentColor }} />
                    }
                    title={isNc ? nc!.maquina : `NF ${nf!.nf}`}
                    subtitle={isNc
                      ? `${nc!.totalNC.toLocaleString("pt-BR")} ite${nc!.totalNC === 1 ? "m" : "ns"} não conforme${nc!.totalNC === 1 ? "" : "s"}`
                      : "Sem certificado FSC vinculado"
                    }
                    dataLabel={formatDataLabel(item.data)}
                    onClick={() => handleClick(item)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Item genérico ────────────────────────────────────────────────────────────

interface AlertItemProps {
  lida: boolean;
  accentColor: string;
  bgUnread: string;
  iconBgUnread: string;
  dotColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  dataLabel: string;
  onClick: () => void;
}

function AlertItem({
  lida, accentColor, bgUnread, iconBgUnread, dotColor,
  icon, title, subtitle, dataLabel, onClick,
}: AlertItemProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 16px",
        borderBottom: "1px solid #f9fafb",
        background: hover ? "#f3f4f6" : lida ? "#fff" : bgUnread,
        border: "none", cursor: "pointer", transition: "background .15s",
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: lida ? "#f3f4f6" : iconBgUnread,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: lida ? 400 : 600,
          color: lida ? "#6b7280" : "#111",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </div>
        <div style={{ fontSize: 11, marginTop: 2 }}>
          <span style={{ color: lida ? "#9ca3af" : accentColor, fontWeight: lida ? 400 : 500 }}>
            {subtitle}
          </span>
          {" · "}
          <span style={{ color: "#9ca3af" }}>{dataLabel}</span>
        </div>
      </div>
      {!lida && (
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      )}
    </button>
  );
}
