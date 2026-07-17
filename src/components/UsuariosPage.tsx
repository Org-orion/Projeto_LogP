"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// O módulo Usuários virou o módulo Administração, com rota real
// (/admin/users). Este componente só existe como rede de segurança pra quem
// ainda tem `logp_section=usuarios` salvo no localStorage de antes da
// migração — a navegação normal (sidebar) não passa mais por aqui.
export default function UsuariosPage({ isAdmin: _isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return null;
}
