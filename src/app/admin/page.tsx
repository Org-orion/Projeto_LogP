"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Users, ShieldCheck, LogIn, ShieldAlert, UserX, History } from "lucide-react";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import type { AuditLogRow } from "@/components/admin/AuditTable";
import { RequirePagina } from "@/components/RequirePagina";

interface UsuarioResumo { status?: string }

function AdminDashboardPageInner() {
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [totalBloqueados, setTotalBloqueados] = useState(0);
  const [totalPerfis, setTotalPerfis] = useState(0);
  const [loginsHoje, setLoginsHoje] = useState(0);
  const [falhasHoje, setFalhasHoje] = useState(0);
  const [ultimaAlteracao, setUltimaAlteracao] = useState<AuditLogRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDados = useCallback(async () => {
    setLoading(true);
    const hoje = format(new Date(), "yyyy-MM-dd");

    const [usuariosRes, perfisRes, auditRes] = await Promise.all([
      fetch("/api/usuarios").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/perfis").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/audit?de=${hoje}`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);

    const usuarios: UsuarioResumo[] = usuariosRes.data ?? [];
    setTotalAtivos(usuarios.filter((u) => (u.status ?? "ativo") === "ativo").length);
    setTotalBloqueados(usuarios.filter((u) => u.status === "bloqueado").length);
    setTotalPerfis((perfisRes.data ?? []).length);

    const auditHoje: AuditLogRow[] = auditRes.data ?? [];
    setLoginsHoje(auditHoje.filter((a) => a.acao === "login" && a.resultado === "sucesso").length);
    setFalhasHoje(auditHoje.filter((a) => a.acao === "login" && a.resultado === "falha").length);

    const semLoginLogout = auditHoje.filter((a) => a.acao !== "login" && a.acao !== "logout");
    setUltimaAlteracao(semLoginLogout[0] ?? null);

    setLoading(false);
  }, []);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Administração"
        description="Visão geral de usuários, perfis e segurança de acesso."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard icon={Users} label="Usuários Ativos" value={totalAtivos} loading={loading} />
        <AdminKpiCard icon={ShieldCheck} label="Perfis Cadastrados" value={totalPerfis} loading={loading} />
        <AdminKpiCard icon={LogIn} label="Logins Hoje" value={loginsHoje} loading={loading} />
        <AdminKpiCard icon={ShieldAlert} label="Falhas de Login Hoje" value={falhasHoje} tone={falhasHoje > 0 ? "warning" : "primary"} loading={loading} />
        <AdminKpiCard icon={UserX} label="Usuários Bloqueados" value={totalBloqueados} tone={totalBloqueados > 0 ? "destructive" : "primary"} loading={loading} />
        <AdminKpiCard
          icon={History} label="Última Alteração"
          value={loading ? "…" : ultimaAlteracao ? format(new Date(ultimaAlteracao.created_at), "dd/MM HH:mm") : "—"}
          tone="neutral" loading={loading}
          tooltip={ultimaAlteracao?.descricao}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequirePagina pagina="usuarios:dashboard">
      <AdminDashboardPageInner />
    </RequirePagina>
  );
}
