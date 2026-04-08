"use client";

import { useState, useEffect } from "react";
import Login from "@/views/Login";
import Dashboard from "@/views/Dashboard";

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

export default function Home() {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("logp_user");
    if (stored) setUser(JSON.parse(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogin = (userData: UsuarioLogado) => {
    localStorage.setItem("logp_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("logp_user");
    localStorage.removeItem("logp_section");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
