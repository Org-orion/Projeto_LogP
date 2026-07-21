"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users, HardHat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { UserTable, type Usuario } from "@/components/admin/UserTable";
import { UserDrawer } from "@/components/admin/UserDrawer";
import { UserStats, type UserStatsData } from "@/components/admin/UserStats";
import { EMPTY_USER_FORM, type UserFormValues } from "@/components/admin/UserForm";
import { OperadoresTab } from "@/components/admin/OperadoresTab";
import { RequirePagina } from "@/components/RequirePagina";
import { useSessionUser } from "@/context/session-context";

interface PerfilOption { id: number; nome: string }

// Operadores de produção (tabela `operadores`, login do tablet de cada
// máquina) não são usuários web — não têm relação com `usuarios`/RBAC. Ver
// OperadoresTab.tsx, de onde esta mesma consulta foi extraída.
interface Operador { id: number; nome: string; ativo?: boolean }

const ULTIMO_ACESSO_OPCOES = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "nunca", label: "Nunca acessou" },
];

function AdminUsersPageInner() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [perfis, setPerfis] = useState<PerfilOption[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = String(useSessionUser()?.id ?? "");

  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [filtroAcesso, setFiltroAcesso] = useState("todos");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [formValues, setFormValues] = useState<UserFormValues>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmAcao, setConfirmAcao] = useState<{ tipo: "bloquear" | "desbloquear" | "excluir" | "forcar-logout"; usuario: Usuario } | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    const json = await res.json();
    if (res.ok) setUsuarios(json.data ?? []);
    else toast.error(json.error ?? "Erro ao carregar usuários.");
    setLoading(false);
  }, []);

  const fetchPerfis = useCallback(async () => {
    const res = await fetch("/api/perfis");
    const json = await res.json().catch(() => ({ data: [] }));
    if (res.ok) setPerfis((json.data ?? []).map((p: { id: number; nome: string }) => ({ id: p.id, nome: p.nome })));
  }, []);

  const fetchOperadores = useCallback(async () => {
    const { data } = await supabase.from("operadores").select("id, nome, ativo").order("id");
    setOperadores(data ?? []);
  }, []);

  useEffect(() => {
    fetchUsuarios();
    fetchPerfis();
    fetchOperadores();
  }, [fetchUsuarios, fetchPerfis, fetchOperadores]);

  const setores = useMemo(() => Array.from(new Set(usuarios.map((u) => u.setor).filter(Boolean))) as string[], [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const hoje = new Date().toDateString();
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return usuarios.filter((u) => {
      if (filtroPerfil !== "todos" && u.perfil !== filtroPerfil) return false;
      if (filtroStatus !== "todos" && (u.status ?? "ativo") !== filtroStatus) return false;
      if (filtroSetor !== "todos" && u.setor !== filtroSetor) return false;
      if (filtroAcesso === "hoje" && (!u.ultimo_login || new Date(u.ultimo_login).toDateString() !== hoje)) return false;
      if (filtroAcesso === "semana" && (!u.ultimo_login || new Date(u.ultimo_login).getTime() < seteDiasAtras)) return false;
      if (filtroAcesso === "nunca" && u.ultimo_login) return false;
      return true;
    });
  }, [usuarios, filtroPerfil, filtroStatus, filtroSetor, filtroAcesso]);

  const stats: UserStatsData = useMemo(() => {
    const hoje = new Date().toDateString();
    return {
      total: usuarios.length,
      ativos: usuarios.filter((u) => (u.status ?? "ativo") === "ativo").length,
      bloqueados: usuarios.filter((u) => u.status === "bloqueado").length,
      administradores: usuarios.filter((u) => u.perfil === "Administrador").length,
      supervisores: usuarios.filter((u) => u.perfil === "Supervisor").length,
      // Operador não é um perfil de `usuarios` — vem da tabela `operadores`
      // (login do tablet de cada máquina), ver fetchOperadores acima.
      operadores: operadores.length,
      acessosHoje: usuarios.filter((u) => u.ultimo_login && new Date(u.ultimo_login).toDateString() === hoje).length,
    };
  }, [usuarios, operadores]);

  function openNew() {
    setEditingUser(null);
    setFormValues(EMPTY_USER_FORM);
    setDrawerOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditingUser(u);
    setFormValues({
      nome: u.nome, email: u.email, senha: "", perfil: u.perfil ?? "Visualizador", paginas: u.paginas ?? [],
      matricula: u.matricula ?? "", cargo: u.cargo ?? "", setor: u.setor ?? "", telefone: u.telefone ?? "",
      status: u.status ?? "ativo", deve_trocar_senha: !!u.deve_trocar_senha,
    });
    setDrawerOpen(true);
  }

  function openHistorico(u: Usuario) {
    openEdit(u);
  }

  // Operador de Produção novo não é um usuário web — vai direto pra tabela
  // `operadores` (mesma que o tablet de cada máquina usa pra logar), nunca
  // pra `usuarios`/`/api/usuarios`. Ver UserForm.tsx (isOperadorNovo) e
  // OperadoresTab.tsx (mesmo padrão de insert reaproveitado aqui).
  async function handleSaveOperadorNovo() {
    if (!formValues.nome.trim()) {
      toast.error("Preencha o nome.");
      return;
    }
    if (!formValues.senha.trim()) {
      toast.error("Informe a senha do app para o novo operador.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("operadores").insert({
      nome: formValues.nome.trim(),
      matricula: formValues.matricula.trim() || null,
      maquina: formValues.maquina || null,
      ativo: formValues.status !== "inativo",
      senha: formValues.senha.trim(),
    });
    if (error) toast.error("Erro ao cadastrar operador: " + error.message);
    else {
      toast.success("Operador cadastrado.");
      setDrawerOpen(false);
      fetchOperadores();
    }
    setSaving(false);
  }

  async function handleSave() {
    if (!editingUser && formValues.perfil === "Operador") {
      await handleSaveOperadorNovo();
      return;
    }
    if (!formValues.nome.trim() || !formValues.email.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (!editingUser && !formValues.senha.trim()) {
      toast.error("Informe a senha para o novo usuário.");
      return;
    }
    setSaving(true);
    const isAdminPerfil = formValues.perfil === "Administrador";
    const payload = { ...formValues, paginas: isAdminPerfil ? undefined : formValues.paginas };

    const res = editingUser
      ? await fetch(`/api/usuarios/${editingUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((editingUser ? "Erro ao atualizar: " : "Erro ao cadastrar: ") + (json.error ?? "erro desconhecido"));
    } else {
      toast.success(editingUser ? "Usuário atualizado." : "Usuário cadastrado.");
      setDrawerOpen(false);
      fetchUsuarios();
    }
    setSaving(false);
  }

  async function handleRedefinirSenha(u: Usuario) {
    const novaSenha = window.prompt(`Nova senha para ${u.nome}:`);
    if (!novaSenha?.trim()) return;
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: u.nome, email: u.email, perfil: u.perfil, paginas: u.paginas, senha: novaSenha.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error("Erro: " + (json.error ?? "erro desconhecido"));
    else toast.success("Senha redefinida.");
  }

  async function handleConfirmarAcao() {
    if (!confirmAcao) return;
    const { tipo, usuario } = confirmAcao;
    if (tipo === "excluir") {
      const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error("Erro: " + (json.error ?? "erro desconhecido"));
      else { toast.success("Usuário removido."); fetchUsuarios(); }
    } else if (tipo === "forcar-logout") {
      const res = await fetch(`/api/usuarios/${usuario.id}/forcar-logout`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error("Erro: " + (json.error ?? "erro desconhecido"));
      else { toast.success("Logout forçado em todos os dispositivos."); fetchUsuarios(); }
    } else {
      const novoStatus = tipo === "bloquear" ? "bloqueado" : "ativo";
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, paginas: usuario.paginas, status: novoStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error("Erro: " + (json.error ?? "erro desconhecido"));
      else { toast.success(tipo === "bloquear" ? "Usuário bloqueado." : "Usuário desbloqueado."); fetchUsuarios(); }
    }
    setConfirmAcao(null);
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="usuarios">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="usuarios" className="gap-2"><Users className="h-4 w-4" /> Usuários Web</TabsTrigger>
            <TabsTrigger value="operadores" className="gap-2"><HardHat className="h-4 w-4" /> Operadores de Produção</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="usuarios" className="space-y-4 mt-4">
          <SettingsPageHeader
            title="Usuários"
            description="Gerencie os usuários que possuem acesso ao sistema da CONCREM."
            actions={<Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Novo Usuário</Button>}
          />

          <UserStats data={stats} loading={loading} />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os perfis</SelectItem>
                {perfis.map((p) => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {filtroPerfil !== "Operador" && (
              <>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                {setores.length > 0 && (
                  <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os setores</SelectItem>
                      {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filtroAcesso} onValueChange={setFiltroAcesso}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Último acesso" /></SelectTrigger>
                  <SelectContent>
                    {ULTIMO_ACESSO_OPCOES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {filtroPerfil === "Operador" ? (
            // Operador não é linha de `usuarios` — reaproveita a mesma aba/consulta
            // real (tabela `operadores`) em vez de filtrar uma lista que nunca tem
            // esse perfil (era isso que gerava "Nenhum usuário encontrado").
            <OperadoresTab />
          ) : (
            <UserTable
              rows={usuariosFiltrados}
              currentUserId={currentUserId}
              onView={openEdit}
              onEdit={openEdit}
              onBloquear={(u) => setConfirmAcao({ tipo: "bloquear", usuario: u })}
              onDesbloquear={(u) => setConfirmAcao({ tipo: "desbloquear", usuario: u })}
              onRedefinirSenha={handleRedefinirSenha}
              onHistorico={openHistorico}
              onExcluir={(u) => setConfirmAcao({ tipo: "excluir", usuario: u })}
            />
          )}
        </TabsContent>

        <TabsContent value="operadores" className="mt-4">
          <OperadoresTab />
        </TabsContent>
      </Tabs>

      <UserDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        values={formValues}
        onChange={setFormValues}
        perfis={perfis}
        editing={!!editingUser}
        usuarioId={editingUser?.id ?? null}
        ultimoLogin={editingUser?.ultimo_login}
        ultimoIp={editingUser?.ultimo_ip}
        saving={saving}
        onSave={handleSave}
        onForcarLogout={editingUser ? () => setConfirmAcao({ tipo: "forcar-logout", usuario: editingUser }) : undefined}
      />

      <ConfirmDialog
        open={!!confirmAcao}
        onOpenChange={(open) => !open && setConfirmAcao(null)}
        title={
          confirmAcao?.tipo === "excluir" ? `Excluir ${confirmAcao.usuario.nome}?` :
          confirmAcao?.tipo === "bloquear" ? `Bloquear ${confirmAcao.usuario.nome}?` :
          confirmAcao?.tipo === "forcar-logout" ? `Forçar logout de ${confirmAcao.usuario.nome}?` :
          confirmAcao ? `Desbloquear ${confirmAcao.usuario.nome}?` : ""
        }
        description={
          confirmAcao?.tipo === "excluir" ? "Esta ação não pode ser desfeita." :
          confirmAcao?.tipo === "bloquear" ? "O usuário não conseguirá mais fazer login até ser desbloqueado." :
          confirmAcao?.tipo === "forcar-logout" ? "A senha atual dele deixa de funcionar e todas as sessões ativas são encerradas. Ele vai precisar definir uma senha nova no próximo acesso." :
          "O usuário volta a conseguir fazer login normalmente."
        }
        confirmLabel={confirmAcao?.tipo === "excluir" ? "Excluir" : confirmAcao?.tipo === "bloquear" ? "Bloquear" : confirmAcao?.tipo === "forcar-logout" ? "Forçar logout" : "Desbloquear"}
        destructive={confirmAcao?.tipo === "excluir" || confirmAcao?.tipo === "bloquear" || confirmAcao?.tipo === "forcar-logout"}
        onConfirm={handleConfirmarAcao}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePagina pagina="usuarios:users">
      <AdminUsersPageInner />
    </RequirePagina>
  );
}
