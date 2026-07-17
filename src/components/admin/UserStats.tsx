"use client";

import { Users, UserCheck, UserX, ShieldCheck, Eye, HardHat, Clock } from "lucide-react";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export interface UserStatsData {
  total: number;
  ativos: number;
  bloqueados: number;
  administradores: number;
  supervisores: number;
  operadores: number;
  acessosHoje: number;
}

interface UserStatsProps {
  data: UserStatsData;
  loading?: boolean;
}

// Linha de KPIs da página Usuários — total/ativos/bloqueados/por perfil/acessos.
export function UserStats({ data, loading }: UserStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <AdminKpiCard icon={Users} label="Total de Usuários" value={data.total} loading={loading} tooltip="Todos os usuários cadastrados" />
      <AdminKpiCard icon={UserCheck} label="Usuários Ativos" value={data.ativos} loading={loading} tooltip="Status = Ativo" />
      <AdminKpiCard icon={UserX} label="Usuários Bloqueados" value={data.bloqueados} tone="destructive" loading={loading} tooltip="Status = Bloqueado" />
      <AdminKpiCard icon={ShieldCheck} label="Administradores" value={data.administradores} loading={loading} />
      <AdminKpiCard icon={Eye} label="Supervisores" value={data.supervisores} loading={loading} />
      <AdminKpiCard icon={HardHat} label="Operadores" value={data.operadores} loading={loading} />
      <AdminKpiCard icon={Clock} label="Acessos Hoje" value={data.acessosHoje} tone="neutral" loading={loading} tooltip="Logins bem-sucedidos hoje" />
    </div>
  );
}
