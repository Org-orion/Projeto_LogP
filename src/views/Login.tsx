"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { motion, useTransform, useSpring, useMotionTemplate } from "framer-motion";
import { ShieldCheck, Link2, Leaf } from "lucide-react";
import { toast } from "sonner";
import { LoginAnimatedBackground } from "@/components/LoginAnimatedBackground";
import { LoginHero } from "@/components/login/LoginHero";
import { LoginCard, type Ripple } from "@/components/login/LoginCard";
import { ACCENT, TEXT_FAINT, BORDER_SUBTLE, BORDER_HOVER, INPUT_BG, INPUT_BG_FOCUS } from "@/components/login/tokens";
import { useParallaxMouse, useParallaxLayer, PARALLAX_SPRING } from "@/hooks/useParallaxMouse";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

interface LoginProps {
  onLogin: (user: UsuarioLogado) => void;
}

let rippleSeq = 0;

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [remember, setRemember]   = useState(false);
  const [ripples, setRipples]     = useState<Ripple[]>([]);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef    = useRef<HTMLDivElement>(null);
  const turnstileWidget = useRef<string | null>(null);

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current || !window.turnstile || turnstileWidget.current) return;
    turnstileWidget.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }, []);

  // Se o script já tiver sido carregado numa montagem anterior (ex.: logout → login),
  // o onLoad do <Script> não dispara de novo — renderiza aqui como fallback.
  useEffect(() => {
    if (window.turnstile) renderTurnstile();
  }, [renderTurnstile]);

  const { mx, my, enabled: parallaxEnabled, prefersReducedMotion } = useParallaxMouse();
  const cardParallax = useParallaxLayer(mx, my, { intensity: 0.2, invert: true });
  const heroParallax = useParallaxLayer(mx, my, { intensity: 0.5 });
  const footerParallax = useParallaxLayer(mx, my, { intensity: 0.5 });
  const tiltX = useSpring(useTransform(my, [-1, 1], [1, -1]), PARALLAX_SPRING);
  const tiltY = useSpring(useTransform(mx, [-1, 1], [-1, 1]), PARALLAX_SPRING);
  const glowX = useSpring(useTransform(mx, [-1, 1], [0, 100]), PARALLAX_SPRING);
  const glowY = useSpring(useTransform(my, [-1, 1], [0, 100]), PARALLAX_SPRING);
  const cardGlow = useMotionTemplate`radial-gradient(500px circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.06), transparent 70%)`;

  // ── Lógica de autenticação — não alterada ──────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha email e senha."); return; }
    if (!turnstileToken) { toast.error("Confirme a verificação de segurança."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Email ou senha incorretos.");
        window.turnstile?.reset(turnstileWidget.current ?? undefined);
        setTurnstileToken(null);
      } else {
        onLogin(json.user);
      }
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  function spawnRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleSeq;
    const ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 650);
  }
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="login-shell">
      <LoginAnimatedBackground
        mx={mx} my={my}
        enabled={parallaxEnabled}
        prefersReducedMotion={prefersReducedMotion}
      />

      <div className="login-main">
        <div className="login-main-inner">
          <LoginHero
            x={parallaxEnabled ? heroParallax.x : 0}
            y={parallaxEnabled ? heroParallax.y : 0}
          />
          <LoginCard
            email={email}
            password={password}
            showPass={showPass}
            remember={remember}
            loading={loading}
            ripples={ripples}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onToggleShowPass={() => setShowPass(v => !v)}
            onRememberChange={setRemember}
            onSubmit={handleSubmit}
            onButtonClick={spawnRipple}
            parallaxEnabled={parallaxEnabled}
            x={cardParallax.x}
            y={cardParallax.y}
            rotateX={tiltX}
            rotateY={tiltY}
            glow={cardGlow}
            turnstileRef={turnstileRef}
          />
        </div>
      </div>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={renderTurnstile}
      />

      {/* Rodapé — em fluxo normal, nunca sobreposto */}
      <motion.div
        className="login-footer"
        style={{
          x: parallaxEnabled ? footerParallax.x : 0,
          y: parallaxEnabled ? footerParallax.y : 0,
          willChange: "transform",
        }}
      >
        <div className="login-footer-items">
          <FooterItem icon={<ShieldCheck size={18} />} title="Segurança" description="Dados protegidos" />
          <FooterItem icon={<Link2 size={18} />} title="Conexão" description="Sempre disponível" />
          <FooterItem icon={<Leaf size={18} />} title="Sustentabilidade" description="Compromisso ambiental" />
        </div>
        <span style={{ fontSize: 11.5, color: TEXT_FAINT }}>
          © {new Date().getFullYear()} CONCREM · Todos os direitos reservados.
        </span>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .login-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .login-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 5vw;
        }
        .login-main-inner {
          width: 100%;
          max-width: 1400px;
          display: grid;
          grid-template-columns: 55fr 45fr;
          align-items: center;
          gap: 48px;
        }

        /* ── Hero editorial ── */
        .login-hero { padding-right: 24px; }
        .login-hero-logo-badge {
          display: inline-flex;
          margin-bottom: 24px;
        }
        .login-hero-headline {
          font-size: clamp(30px, 3.4vw, 46px); font-weight: 700; color: #fff;
          margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.12;
          text-shadow: 0 4px 24px rgba(0,0,0,0.35);
          max-width: 560px;
        }
        .login-hero-sub {
          font-size: 16px; line-height: 1.65; color: rgba(255,255,255,0.75);
          max-width: 460px; margin: 0 0 28px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .login-hero-chips { display: flex; flex-wrap: wrap; gap: 10px; }
        .login-hero-chip {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; color: #fff;
          padding: 7px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(6px);
        }
        .login-hero-chip svg { color: ${ACCENT}; }

        /* ── Painel / card ── */
        .login-panel-col { display: flex; justify-content: flex-end; }
        .login-card-wrap { width: 100%; max-width: 480px; }

        .login-glass {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: min(660px, 80vh);
          background: rgba(18, 22, 28, 0.42);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          padding: 44px;
          box-shadow:
            0 30px 60px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.16);
          overflow: hidden;
        }
        .login-glass-sidelight {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.10), transparent 60%);
          pointer-events: none;
        }

        .login-input {
          width: 100%; height: 56px; border-radius: 14px;
          border: 1px solid ${BORDER_SUBTLE};
          background: ${INPUT_BG};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #fff; font-size: 14.5;
          padding: 0 16px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.4); transition: opacity 0.2s ease; }
        .login-input:hover { border-color: ${BORDER_HOVER}; }
        .login-input:focus {
          border-color: ${ACCENT};
          box-shadow: 0 0 20px rgba(34,197,94,0.18);
          background: ${INPUT_BG_FOCUS};
        }
        .login-input:focus::placeholder { opacity: 0.5; }

        .login-eye-btn {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; color: ${TEXT_FAINT};
          padding: 4px; line-height: 1;
          transition: color 0.2s ease;
        }
        .login-eye-btn:hover { color: #fff; }

        .login-remember-label { transition: color 0.2s ease; }
        .login-remember-label:hover { color: rgba(255,255,255,0.9) !important; }

        .login-submit-btn { position: relative; overflow: hidden; transition: filter 0.2s ease, box-shadow 0.2s ease; }
        .login-submit-btn:hover { filter: brightness(1.08); }
        .login-submit-btn::after {
          content: '';
          position: absolute; top: 0; left: -75%;
          width: 50%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg);
          pointer-events: none;
        }
        .login-submit-btn:hover::after { animation: login-btn-shimmer 0.8s ease; }
        @keyframes login-btn-shimmer { from { left: -75%; } to { left: 125%; } }

        .login-btn-ripple {
          position: absolute; width: 10px; height: 10px; margin: -5px;
          border-radius: 50%; background: rgba(255,255,255,0.5);
          transform: scale(0); opacity: 0.6;
          animation: login-ripple 0.6s ease-out forwards;
          pointer-events: none;
        }
        @keyframes login-ripple { to { transform: scale(20); opacity: 0; } }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          padding: 28px 32px 32px;
        }
        .login-footer-items {
          display: flex; align-items: flex-start; justify-content: center;
          gap: 56px; flex-wrap: wrap;
        }

        @media (max-width: 1180px) {
          .login-hero { display: none !important; }
          .login-main-inner { grid-template-columns: 1fr; display: flex; justify-content: center; }
        }
        @media (max-width: 640px) {
          .login-card-wrap { max-width: 92vw; }
          .login-main { padding: 24px 4vw; }
          .login-glass { padding: 32px 24px; }
          .login-footer { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-submit-btn:hover::after { animation: none; }
        }
      `}</style>
    </div>
  );
};

function FooterItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center", minWidth: 110 }}>
      <div style={{ color: ACCENT }}>{icon}</div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{title}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{description}</span>
    </div>
  );
}

export default Login;
