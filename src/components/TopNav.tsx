"use client";

import { useState, useRef, useEffect } from "react";
import {
  Home, Factory, ShieldCheck, Leaf, UserCog, Settings,
  Search, Bell, ChevronDown, LogOut,
} from "lucide-react";
import ConnectionBadge from "./ConnectionBadge";

const PRODUCAO_SUBS = [
  { id: "machines",        name: "Produção" },
  { id: "rastreabilidade", name: "Rastreabilidade" },
];

const QUALIDADE_SUBS = [
  { id: "gramatura",          name: "Gramatura" },
  { id: "recebimento",        name: "Recebimento de Insumos" },
  { id: "nao-conformidades",  name: "Não Conformidades" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "usuário";
}

const activeItemStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(61,160,106,0.22), rgba(61,160,106,0.08))",
  boxShadow: "inset 0 0 0 1px rgba(61,160,106,0.35)",
  color: "#fff",
  fontWeight: 600,
};

const dropdownListStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  minWidth: 210,
  background: "#0a3620",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: 6,
  boxShadow: "0 16px 40px rgba(6,24,16,0.5)",
  listStyle: "none",
  zIndex: 80,
};

/* ── Shared nav button ───────────────────────────────────────────────────── */
function NavBtn({
  icon: Icon, label, isActive, extra, onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  extra?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="topnav-btn"
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "9px 14px", borderRadius: 8,
        fontSize: 12.5, fontWeight: isActive ? 600 : 500,
        letterSpacing: "0.01em",
        color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
        border: "none", cursor: "pointer", background: "none",
        whiteSpace: "nowrap", transition: "background .2s, color .2s",
        ...(isActive ? activeItemStyle : {}),
      }}
    >
      <Icon size={15} style={{ opacity: isActive ? 1 : 0.8, color: isActive ? "#5dc287" : "inherit", flexShrink: 0 }} />
      {label}
      {extra}
    </button>
  );
}

/* ── Dropdown item ───────────────────────────────────────────────────────── */
function DropdownItem({
  label, isActive, onClick,
}: {
  label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="topnav-btn"
        style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "9px 12px", borderRadius: 6,
          fontSize: 12.5, fontWeight: isActive ? 600 : 400,
          color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
          background: isActive ? "rgba(61,160,106,0.18)" : "none",
          border: "none", cursor: "pointer",
          transition: "background .15s, color .15s",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </button>
    </li>
  );
}

/* ── Chevron ─────────────────────────────────────────────────────────────── */
function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={11}
      style={{
        opacity: 0.55, flexShrink: 0,
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform .2s",
      }}
    />
  );
}

/* ── TopNav ──────────────────────────────────────────────────────────────── */
interface TopNavProps {
  activeSection: string;
  onSectionSelect: (id: string) => void;
  allowedSections: string[];
  qualidadeSubSection: string;
  onQualidadeSubSelect: (sub: string) => void;
  user: { nome: string; perfil?: string };
  onLogout: () => void;
}

export function TopNav({
  activeSection,
  onSectionSelect,
  allowedSections,
  qualidadeSubSection,
  onQualidadeSubSelect,
  user,
  onLogout,
}: TopNavProps) {
  const [openGroup, setOpenGroup]       = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const isProducaoActive  = PRODUCAO_SUBS.some(s => s.id === activeSection);
  const isQualidadeActive = activeSection === "qualidade";
  const showProducao  = PRODUCAO_SUBS.some(s => allowedSections.includes(s.id));
  const showQualidade = allowedSections.includes("qualidade");

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function navClick(id: string) {
    onSectionSelect(id);
    setOpenGroup(null);
    setUserMenuOpen(false);
  }

  function qualidadeSubClick(sub: string) {
    onSectionSelect("qualidade");
    onQualidadeSubSelect(sub);
    setOpenGroup(null);
  }

  const initials  = getInitials(user.nome);
  const firstName = getFirstName(user.nome);

  return (
    <header
      ref={headerRef}
      style={{
        position: "sticky", top: 0, zIndex: 60,
        background: "linear-gradient(180deg, #0a3620 0%, #08301c 100%)",
        color: "rgba(255,255,255,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 2px 12px rgba(10,40,24,0.15)",
      }}
    >
      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: -1, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(61,160,106,0.5), transparent)",
        pointerEvents: "none",
      }} />

      <div style={{
        display: "flex", alignItems: "center", gap: 28,
        padding: "0 32px", height: 64,
        maxWidth: 1600, margin: "0 auto",
      }}>

        {/* ── Brand ── */}
        <div style={{
          display: "flex", alignItems: "center",
          paddingRight: 24,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          height: 42, flexShrink: 0,
        }}>
          <img
            src="/images/logo-branco.png"
            alt="Concrem Portas Premium"
            style={{ height: 32, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* ── Nav links ── */}
        <ul style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 4, flex: 1, padding: 0, margin: 0 }}>

          {allowedSections.includes("home") && (
            <li>
              <NavBtn icon={Home} label="Home" isActive={activeSection === "home"} onClick={() => navClick("home")} />
            </li>
          )}

          {showProducao && (
            <li style={{ position: "relative" }}>
              <NavBtn
                icon={Factory} label="Produção" isActive={isProducaoActive}
                extra={<Chevron open={openGroup === "producao"} />}
                onClick={() => setOpenGroup(g => g === "producao" ? null : "producao")}
              />
              {openGroup === "producao" && (
                <ul style={dropdownListStyle}>
                  {PRODUCAO_SUBS.filter(s => allowedSections.includes(s.id)).map(sub => (
                    <DropdownItem
                      key={sub.id} label={sub.name}
                      isActive={activeSection === sub.id}
                      onClick={() => navClick(sub.id)}
                    />
                  ))}
                </ul>
              )}
            </li>
          )}

          {showQualidade && (
            <li style={{ position: "relative" }}>
              <NavBtn
                icon={ShieldCheck} label="Controle de Qualidade" isActive={isQualidadeActive}
                extra={<Chevron open={openGroup === "qualidade"} />}
                onClick={() => setOpenGroup(g => g === "qualidade" ? null : "qualidade")}
              />
              {openGroup === "qualidade" && (
                <ul style={dropdownListStyle}>
                  {QUALIDADE_SUBS.map(sub => (
                    <DropdownItem
                      key={sub.id} label={sub.name}
                      isActive={isQualidadeActive && qualidadeSubSection === sub.id}
                      onClick={() => qualidadeSubClick(sub.id)}
                    />
                  ))}
                </ul>
              )}
            </li>
          )}

          {allowedSections.includes("material-fsc") && (
            <li>
              <NavBtn icon={Leaf} label="Material Cert. (FSC)" isActive={activeSection === "material-fsc"} onClick={() => navClick("material-fsc")} />
            </li>
          )}

          {allowedSections.includes("usuarios") && (
            <li>
              <NavBtn icon={UserCog} label="Usuários" isActive={activeSection === "usuarios"} onClick={() => navClick("usuarios")} />
            </li>
          )}

          {allowedSections.includes("configuracoes") && (
            <li>
              <NavBtn icon={Settings} label="Configurações" isActive={activeSection === "configuracoes"} onClick={() => navClick("configuracoes")} />
            </li>
          )}

        </ul>

        {/* ── Actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexShrink: 0 }}>

          {/* Search */}
          <div
            className="topnav-search"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "7px 12px", width: 240,
            }}
          >
            <Search size={14} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
            <input
              placeholder="Buscar produtos, lotes…"
              style={{
                border: "none", background: "none", outline: "none",
                fontSize: 12, width: "100%", color: "#fff",
                fontWeight: 400, fontFamily: "inherit",
              }}
            />
          </div>

          {/* Connection status */}
          <ConnectionBadge />

          {/* Notification bell */}
          <button
            className="topnav-btn"
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: "grid", placeItems: "center",
              color: "rgba(255,255,255,0.75)",
              position: "relative", border: "none", background: "none", cursor: "pointer",
            }}
          >
            <Bell size={16} />
            <span style={{
              position: "absolute", top: 6, right: 6,
              width: 7, height: 7, borderRadius: "50%",
              background: "#ff8a5c", border: "2px solid #08301c",
            }} />
          </button>

          {/* User avatar + menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "4px 12px 4px 4px", borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", color: "inherit",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #2a6e48, #5dc287)",
                color: "#fff", display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 600,
              }}>
                {initials}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>{firstName}</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {user.perfil ?? "Usuário"}
                </span>
              </div>
            </button>

            {userMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#0a3620",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: 6,
                boxShadow: "0 16px 40px rgba(6,24,16,0.5)",
                minWidth: 140, zIndex: 80,
              }}>
                <button
                  onClick={onLogout}
                  className="topnav-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", textAlign: "left",
                    padding: "9px 12px", borderRadius: 6,
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.7)",
                    background: "none", border: "none", cursor: "pointer",
                    letterSpacing: "0.01em",
                  }}
                >
                  <LogOut size={13} /> Sair
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        .topnav-btn:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #fff !important;
        }
        .topnav-search:focus-within {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(61,160,106,0.4) !important;
        }
        @media (max-width: 768px) {
          .topnav-search { display: none !important; }
        }
      `}</style>
    </header>
  );
}
