"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsPageHeader } from "@/components/configuracoes/SettingsPageHeader";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";
import { AuditTable, type AuditLogRow } from "@/components/admin/AuditTable";
import { AuditDrawer } from "@/components/admin/AuditDrawer";
import { SpinnerCustom } from "@/components/ui/spinner";

const MODULOS = ["autenticacao", "administracao"];
const ACOES = [
  "login", "logout", "criar_usuario", "editar_usuario", "excluir_usuario",
  "bloquear_usuario", "desbloquear_usuario", "redefinir_senha", "alterar_perfil",
  "alterar_permissoes", "criar_perfil", "editar_perfil", "excluir_perfil",
];

function AdminAuditPageInner() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<AuditLogRow | null>(null);

  const [usuario, setUsuario] = useState("");
  const [modulo, setModulo] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [resultado, setResultado] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const params = new URLSearchParams();
    if (usuario.trim()) params.set("usuario", usuario.trim());
    if (modulo !== "todos") params.set("modulo", modulo);
    if (acao !== "todas") params.set("acao", acao);
    if (resultado !== "todos") params.set("resultado", resultado);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);

    const res = await fetch(`/api/audit?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setErro(json.error ?? "Erro ao carregar auditoria.");
    else setRows(json.data ?? []);
    setLoading(false);
  }, [usuario, modulo, acao, resultado, de, ate]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <RequirePerfil perfis={["Administrador"]}>
      <div className="space-y-4">
        <SettingsPageHeader
          title="Auditoria"
          description="Log somente leitura de ações do sistema — login/logout, criação, edição, exclusão, bloqueio e mudanças de perfil/permissão."
        />

        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar por usuário..." value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-8 w-48 text-xs" />
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os módulos</SelectItem>
              {MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={acao} onValueChange={setAcao}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as ações</SelectItem>
              {ACOES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Resultado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Sucesso e falha</SelectItem>
              <SelectItem value="sucesso">Só sucesso</SelectItem>
              <SelectItem value="falha">Só falha</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-8 w-36 text-xs" title="De" />
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-8 w-36 text-xs" title="Até" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
        ) : erro ? (
          <p className="text-sm text-destructive py-8 text-center">{erro}</p>
        ) : (
          <AuditTable rows={rows} onRowClick={setSelecionado} />
        )}

        <AuditDrawer row={selecionado} onOpenChange={(open) => !open && setSelecionado(null)} />
      </div>
    </RequirePerfil>
  );
}

export default function AdminAuditPage() {
  return (
    <RequirePagina pagina="usuarios:audit">
      <AdminAuditPageInner />
    </RequirePagina>
  );
}
