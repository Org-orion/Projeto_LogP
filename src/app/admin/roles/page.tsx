"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { RoleTable, type Perfil } from "@/components/admin/RoleTable";
import { RoleForm, type RoleFormValues } from "@/components/admin/RoleForm";
import { RoleStats } from "@/components/admin/RoleStats";
import type { PermissaoRow } from "@/types/rbac";
import { RequirePagina } from "@/components/RequirePagina";

const EMPTY_ROLE_FORM: RoleFormValues = { nome: "", descricao: "", status: "ativo" };

function AdminRolesPageInner() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [catalogo, setCatalogo] = useState<PermissaoRow[]>([]);
  const [modulosPorPerfil, setModulosPorPerfil] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [formValues, setFormValues] = useState<RoleFormValues>(EMPTY_ROLE_FORM);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<Perfil | null>(null);

  const fetchTudo = useCallback(async () => {
    setLoading(true);
    const [perfisRes, catalogoRes] = await Promise.all([
      fetch("/api/perfis").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/permissoes").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    const perfisData: Perfil[] = perfisRes.data ?? [];
    const catalogoData: PermissaoRow[] = catalogoRes.data ?? [];
    setPerfis(perfisData);
    setCatalogo(catalogoData);

    const moduloPorId = new Map(catalogoData.map((p) => [p.id, p.modulo]));
    const entradas = await Promise.all(
      perfisData.map(async (p) => {
        const res = await fetch(`/api/perfis/${p.id}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] }));
        const ids: number[] = res.data ?? [];
        const modulos = new Set(ids.map((id) => moduloPorId.get(id)).filter(Boolean));
        return [p.id, modulos.size] as const;
      }),
    );
    setModulosPorPerfil(Object.fromEntries(entradas));
    setLoading(false);
  }, []);

  useEffect(() => { fetchTudo(); }, [fetchTudo]);

  const stats = useMemo(() => ({
    totalPerfis: perfis.length,
    totalUsuariosVinculados: perfis.reduce((s, p) => s + p.qtd_usuarios, 0),
    totalPermissoesCatalogo: catalogo.length,
  }), [perfis, catalogo]);

  function openNew() {
    setEditingPerfil(null);
    setFormValues(EMPTY_ROLE_FORM);
    setSelecionadas(new Set());
    setDrawerOpen(true);
  }

  async function openEdit(p: Perfil) {
    setEditingPerfil(p);
    setFormValues({ nome: p.nome, descricao: p.descricao ?? "", status: p.status });
    const res = await fetch(`/api/perfis/${p.id}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] }));
    setSelecionadas(new Set(res.data ?? []));
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!formValues.nome.trim()) { toast.error("Informe o nome do perfil."); return; }
    setSaving(true);

    let perfilId = editingPerfil?.id ?? null;
    if (editingPerfil) {
      const res = await fetch(`/api/perfis/${editingPerfil.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formValues),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Erro: " + (json.error ?? "erro desconhecido")); setSaving(false); return; }
    } else {
      const res = await fetch("/api/perfis", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formValues),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Erro: " + (json.error ?? "erro desconhecido")); setSaving(false); return; }
      perfilId = json.data.id;
    }

    if (perfilId) {
      const permRes = await fetch(`/api/perfis/${perfilId}/permissoes`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissaoIds: Array.from(selecionadas) }),
      });
      if (!permRes.ok) toast.error("Perfil salvo, mas houve erro ao salvar permissões.");
    }

    toast.success(editingPerfil ? "Perfil atualizado." : "Perfil criado.");
    setDrawerOpen(false);
    setSaving(false);
    fetchTudo();
  }

  async function handleDuplicar(p: Perfil) {
    const res = await fetch("/api/perfis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: `${p.nome} (cópia)`, descricao: p.descricao, status: "ativo" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error("Erro ao duplicar: " + (json.error ?? "erro desconhecido")); return; }

    const permsRes = await fetch(`/api/perfis/${p.id}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] }));
    await fetch(`/api/perfis/${json.data.id}/permissoes`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissaoIds: permsRes.data ?? [] }),
    });

    toast.success(`Perfil "${p.nome}" duplicado.`);
    fetchTudo();
  }

  async function handleExcluir() {
    if (!excluindo) return;
    const res = await fetch(`/api/perfis/${excluindo.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error("Erro: " + (json.error ?? "erro desconhecido"));
    else { toast.success("Perfil excluído."); fetchTudo(); }
    setExcluindo(null);
  }

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Perfis de Acesso"
        description="Perfis reutilizáveis por múltiplos usuários — a permissão vive no perfil, não na pessoa."
        actions={<Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Novo Perfil</Button>}
      />

      <RoleStats {...stats} loading={loading} />

      <RoleTable
        rows={perfis}
        modulosPorPerfil={modulosPorPerfil}
        onEdit={openEdit}
        onDuplicar={handleDuplicar}
        onExcluir={setExcluindo}
      />

      <RoleForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        values={formValues}
        onChange={setFormValues}
        catalogo={catalogo}
        selecionadas={selecionadas}
        onChangeSelecionadas={setSelecionadas}
        editing={!!editingPerfil}
        isAdministrador={editingPerfil?.nome === "Administrador"}
        saving={saving}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!excluindo}
        onOpenChange={(open) => !open && setExcluindo(null)}
        title={excluindo ? `Excluir perfil "${excluindo.nome}"?` : ""}
        description="Só é possível excluir perfis sem usuários vinculados."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <RequirePagina pagina="usuarios:roles">
      <AdminRolesPageInner />
    </RequirePagina>
  );
}
