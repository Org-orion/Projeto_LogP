"use client";

import type { RefObject } from "react";
import { motion, type MotionValue } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ACCENT, ACCENT_DARK, TEXT_MUTED, TEXT_FAINT } from "./tokens";

export interface Ripple { id: number; x: number; y: number }

interface LoginCardProps {
  email: string;
  password: string;
  showPass: boolean;
  remember: boolean;
  loading: boolean;
  ripples: Ripple[];
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onToggleShowPass: () => void;
  onRememberChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onButtonClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  parallaxEnabled: boolean;
  x: MotionValue<number> | number;
  y: MotionValue<number> | number;
  rotateX: MotionValue<number> | number;
  rotateY: MotionValue<number> | number;
  glow: MotionValue<string> | string;
  turnstileRef: RefObject<HTMLDivElement>;
}

// Painel glass da tela de login — mantém a lógica de autenticação intacta
// (recebida via props); aqui só existe apresentação.
export function LoginCard({
  email, password, showPass, remember, loading, ripples,
  onEmailChange, onPasswordChange, onToggleShowPass, onRememberChange,
  onSubmit, onButtonClick, parallaxEnabled, x, y, rotateX, rotateY, glow,
  turnstileRef,
}: LoginCardProps) {
  return (
    <div className="login-panel-col">
      <motion.div
        className="login-card-wrap"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          style={{
            x: parallaxEnabled ? x : 0,
            y: parallaxEnabled ? y : 0,
            rotateX: parallaxEnabled ? rotateX : 0,
            rotateY: parallaxEnabled ? rotateY : 0,
            transformPerspective: 1200,
            willChange: "transform",
          }}
        >
          <div className="login-glass">
            {/* Iluminação lateral (estática, canto superior esquerdo) */}
            <div aria-hidden="true" className="login-glass-sidelight" />
            {/* Brilho sutil acompanhando o cursor */}
            <motion.div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, borderRadius: 24,
                pointerEvents: "none", background: parallaxEnabled ? glow : "none",
              }}
            />

            {/* Logo — pequeno e centralizado */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div className="login-hero-logo-badge">
                <img src="/Logo-Branco.png" alt="Concrem" style={{ height: 32, width: "auto", display: "block" }} />
              </div>
            </div>

            {/* Título do card */}
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                Entrar no sistema
              </h2>
              <p style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 6 }}>
                Informe suas credenciais para continuar.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 17, flex: 1 }}>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: 7 }}>
                  E-mail
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{
                    position: "absolute", left: 16, top: "50%",
                    transform: "translateY(-50%)", color: TEXT_FAINT,
                    pointerEvents: "none",
                  }} />
                  <input
                    className="login-input"
                    type="email"
                    value={email}
                    onChange={e => onEmailChange(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: 7 }}>
                  Senha
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{
                    position: "absolute", left: 16, top: "50%",
                    transform: "translateY(-50%)", color: TEXT_FAINT,
                    pointerEvents: "none",
                  }} />
                  <input
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => onPasswordChange(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={onToggleShowPass}
                    className="login-eye-btn"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="login-remember-label" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT_MUTED, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => onRememberChange(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: ACCENT, cursor: "pointer" }}
                  />
                  Lembrar de mim
                </label>
              </div>

              {/* Turnstile — verificação anti-bot */}
              <div ref={turnstileRef} style={{ display: "flex", justifyContent: "center" }} />

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
                onClick={onButtonClick}
                whileHover={loading ? undefined : { y: -2 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                style={{
                  marginTop: 6,
                  height: 50, borderRadius: 14,
                  background: loading
                    ? `${ACCENT}99`
                    : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                  border: "none",
                  color: "#fff",
                  fontSize: 15, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  boxShadow: loading ? "none" : "0 10px 24px rgba(34,197,94,0.35)",
                  fontFamily: "inherit",
                  letterSpacing: "0.01em",
                }}
              >
                {ripples.map(r => (
                  <span key={r.id} className="login-btn-ripple" style={{ left: r.x, top: r.y }} />
                ))}
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                      flexShrink: 0,
                    }} />
                    Entrando...
                  </>
                ) : "Entrar"}
              </motion.button>
            </form>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 20, fontSize: 11.5, color: TEXT_MUTED,
            }}>
              <ShieldCheck size={13} />
              Acesso restrito a usuários autorizados.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
