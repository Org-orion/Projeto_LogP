"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, ClipboardCopy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { PermissionTree } from "@/components/admin/PermissionTree";
import type { PermissaoRow } from "@/types/rbac";
import { RequirePagina } from "@/components/RequirePagina";

interface PerfilOption { id: number; nome: string }

function AdminPermissionsPageInner() {
  const [perfis, setPerfis] = useState<PerfilOption[]>([]);
  const [catalogo, setCatalogo] = useState<PermissaoRow[]>([]);
  const [perfilId, setPerfilId] = useState<string>("");
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alvoDuplicar, setAlvoDuplicar] = useState<string>("");
  const [confirmCopiar, setConfirmCopiar] = useState(false);

  const fetchBase = useCallback(async () => {
    setLoading(true);
    const [perfisRes, catalogoRes] = await Promise.all([
      fetch("/api/perfis").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/permissoes").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    const perfisData: PerfilOption[] = (perfisRes.data ?? []).map((p: { id: number; nome: string }) => ({ id: p.id, nome: p.nome }));
    setPerfis(perfisData);
    setCatalogo(catalogoRes.data ?? []);
    if (perfisData.length > 0) setPerfilId(String(perfisData[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchBase(); }, [fetchBase]);

  const carregarPermissoesDoPerfil = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/perfis/${id}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] }));
    setSelecionadas(new Set(res.data ?? []));
  }, []);

  useEffect(() => { if (perfilId) carregarPermissoesDoPerfil(perfilId); }, [perfilId, carregarPermissoesDoPerfil]);

  async function handleSalvar() {
    if (!perfilId) return;
    setSaving(true);
    const res = await fetch(`/api/perfis/${perfilId}/permissoes`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissaoIds: Array.from(selecionadas) }),
    });
    if (!res.ok) toast.error("Erro ao salvar permissões.");
    else toast.success("Permissões atualizadas.");
    setSaving(false);
  }

  async function handleDuplicarPerfil() {
    const origem = perfis.find((p) => String(p.id) === perfilId);
    if (!origem) return;
    const res = await fetch("/api/perfis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: `${origem.nome} (cópia)`, descricao: null, status: "ativo" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error("Erro ao duplicar: " + (json.error ?? "erro desconhecido")); return; }
    await fetch(`/api/perfis/${json.data.id}/permissoes`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissaoIds: Array.from(selecionadas) }),
    });
    toast.success(`Perfil "${origem.nome}" duplicado com as mesmas permissões.`);
    fetchBase();
  }

  async function handleCopiarPermissoes() {
    if (!alvoDuplicar) return;
    const res = await fetch(`/api/perfis/${alvoDuplicar}/permissoes`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissaoIds: Array.from(selecionadas) }),
    });
    if (!res.ok) toast.error("Erro ao copiar permissões.");
    else toast.success("Permissões copiadas para o perfil selecionado.");
    setConfirmCopiar(false);
  }

  const perfilAtual = perfis.find((p) => String(p.id) === perfilId);

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Permissões"
        description="Defina, por perfil, o que cada módulo permite fazer."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={perfilId} onValueChange={setPerfilId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
          <SelectContent>
            {perfis.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={handleSalvar} disabled={saving || !perfilId} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={handleDuplicarPerfil} disabled={!perfilId} className="gap-1.5">
          <Copy className="h-4 w-4" /> Duplicar perfil
        </Button>

        <div className="flex items-center gap-1.5 ml-auto">
          <Select value={alvoDuplicar} onValueChange={setAlvoDuplicar}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Copiar permissões para..." /></SelectTrigger>
            <SelectContent>
              {perfis.filter((p) => String(p.id) !== perfilId).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!alvoDuplicar} onClick={() => setConfirmCopiar(true)} className="gap-1.5">
            <ClipboardCopy className="h-4 w-4" /> Copiar
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : !perfilId ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cadastre um perfil em "Perfis de Acesso" primeiro.</p>
      ) : (
        <PermissionTree catalogo={catalogo} selecionadas={selecionadas} onChange={setSelecionadas} />
      )}

      <ConfirmDialog
        open={confirmCopiar}
        onOpenChange={setConfirmCopiar}
        title="Copiar permissões?"
        description={`As permissões marcadas de "${perfilAtual?.nome ?? ""}" vão substituir por completo as permissões do perfil de destino.`}
        confirmLabel="Copiar"
        onConfirm={handleCopiarPermissoes}
      />
    </div>
  );
}

export default function AdminPermissionsPage() {
  return (
    <RequirePagina pagina="usuarios:permissions">
      <AdminPermissionsPageInner />
    </RequirePagina>
  );
}
