"use client";

import { useState } from "react";
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
  const [user, setUser] = useState<UsuarioLogado | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("logp_user");
    return stored ? JSON.parse(stored) : null;
  });

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
