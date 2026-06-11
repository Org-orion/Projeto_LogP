"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [remember, setRemember]   = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha email e senha."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Email ou senha incorretos.");
      } else {
        onLogin(json.user);
      }
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f2f0",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Leaf watermark — bottom left */}
      <img
        src="/leaf-concrem.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-140px",
          bottom: "-120px",
          width: 850,
          height: 850,
          opacity: 0.07,
          pointerEvents: "none",
          userSelect: "none",
          objectFit: "contain",
        }}
      />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 400,
        margin: "0 20px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 32 }}>
            <img
              src="/logo-concrem.png"
              alt="Concrem Portas Premium"
              style={{ height: 60, width: "auto", objectFit: "contain", display: "block" }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 500,
                color: "#374151", marginBottom: 6,
              }}>
                E-mail
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{
                  position: "absolute", left: 13, top: "50%",
                  transform: "translateY(-50%)", color: "#9ca3af",
                  pointerEvents: "none",
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  style={{
                    width: "100%", height: 44, borderRadius: 8,
                    border: "1.5px solid #e5e7eb",
                    background: "#fafafa",
                    color: "#0f1a14", fontSize: 14,
                    padding: "0 14px 0 38px",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#1a5c35";
                    e.target.style.boxShadow = "0 0 0 3px rgba(26,92,53,0.08)";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#fafafa";
                  }}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 500,
                color: "#374151", marginBottom: 6,
              }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{
                  position: "absolute", left: 13, top: "50%",
                  transform: "translateY(-50%)", color: "#9ca3af",
                  pointerEvents: "none",
                }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  style={{
                    width: "100%", height: 44, borderRadius: 8,
                    border: "1.5px solid #e5e7eb",
                    background: "#fafafa",
                    color: "#0f1a14", fontSize: 14,
                    padding: "0 42px 0 38px",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#1a5c35";
                    e.target.style.boxShadow = "0 0 0 3px rgba(26,92,53,0.08)";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#fafafa";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", color: "#9ca3af",
                    padding: 0, lineHeight: 1,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#4b5563")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 13, color: "#6b7a72", cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{
                    width: 15, height: 15, accentColor: "#1a5c35",
                    cursor: "pointer",
                  }}
                />
                Lembrar de mim
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                height: 46, borderRadius: 8,
                background: loading ? "#4d8c65" : "#1a5c35",
                border: "none",
                color: "#fff",
                fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                transition: "background 0.2s, box-shadow 0.2s",
                boxShadow: loading ? "none" : "0 2px 8px rgba(26,92,53,0.3)",
                fontFamily: "inherit",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#22733f"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1a5c35"; }}
            >
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
            </button>
          </form>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #c4ccc7; }
      `}</style>
    </div>
  );
};

export default Login;
