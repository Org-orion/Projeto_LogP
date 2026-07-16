"use client";

import { ShieldCheck, Users, KeyRound } from "lucide-react";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

interface RoleStatsProps {
  totalPerfis: number;
  totalUsuariosVinculados: number;
  totalPermissoesCatalogo: number;
  loading?: boolean;
}

export function RoleStats({ totalPerfis, totalUsuariosVinculados, totalPermissoesCatalogo, loading }: RoleStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminKpiCard icon={ShieldCheck} label="Perfis Cadastrados" value={totalPerfis} loading={loading} />
      <AdminKpiCard icon={Users} label="Usuários com Perfil Atribuído" value={totalUsuariosVinculados} loading={loading} />
      <AdminKpiCard icon={KeyRound} label="Permissões no Catálogo" value={totalPermissoesCatalogo} tone="neutral" loading={loading} />
    </div>
  );
}
