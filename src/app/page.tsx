"use client";

import { useState, useEffect } from "react";
import Login from "@/views/Login";
import Dashboard from "@/views/Dashboard";
import { TrocarSenhaObrigatoria } from "@/components/TrocarSenhaObrigatoria";

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
  deve_trocar_senha?: boolean;
}

export default function Home() {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("logp_user");
    if (!stored) { setMounted(true); return; }

    // Valida se o cookie de sessão ainda é válido antes de entrar no app
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          // Atualiza dados do user caso o perfil tenha mudado no servidor
          const updated = { ...JSON.parse(stored), ...json.user };
          localStorage.setItem("logp_user", JSON.stringify(updated));
          setUser(updated);
        } else {
          // Sessão expirada ou inválida — limpa o estado e volta ao login
          localStorage.removeItem("logp_user");
          localStorage.removeItem("logp_section");
        }
        setMounted(true);
      })
      .catch(() => {
        // Falha de rede: mantém o usuário logado para não desconectar por engano
        setUser(JSON.parse(stored));
        setMounted(true);
      });
  }, []);

  if (!mounted) return null;

  const handleLogin = (userData: UsuarioLogado) => {
    localStorage.setItem("logp_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("logp_user");
    localStorage.removeItem("logp_section");
    localStorage.removeItem("logp_workspace_tabs_v1");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.deve_trocar_senha) {
    return <TrocarSenhaObrigatoria onTrocada={handleLogout} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
