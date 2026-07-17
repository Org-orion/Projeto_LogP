"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SpinnerCustom } from "@/components/ui/spinner";
import { KeyRound, ShieldQuestion, Laptop2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionTree } from "@/components/admin/PermissionTree";
import type { PermissaoRow } from "@/types/rbac";
import { PAGE_PERMISSION_GROUPS } from "@/lib/nav-items";
import { toast } from "sonner";

export interface UserFormValues {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  paginas: string[];
  matricula: string;
  cargo: string;
  setor: string;
  telefone: string;
  status: "ativo" | "pendente" | "bloqueado" | "inativo";
  deve_trocar_senha: boolean;
  /** Só usado ao cadastrar um Operador de Produção novo (tabela `operadores`, login do tablet). */
  maquina?: string;
}

interface PerfilOption { id: number; nome: string }

// Controla quais seções do sidebar aparecem pro usuário (allowedSections),
// mecanismo totalmente separado do catálogo de permissões módulo×ação do RBAC
// novo. Agrupamento vem de nav-items.ts — a mesma fonte que a sidebar usa —
// então esta lista nunca diverge do que o usuário realmente vê pra navegar
// (antes era uma cópia mantida à mão aqui, que já tinha ficado desatualizada:
// citava páginas inexistentes como "registros"/"relatorios"/"ajuda" e não
// tinha "Monitoramento", que existe de verdade).
const PAGE_GROUPS = PAGE_PERMISSION_GROUPS;

export const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.pages);

interface AuditEntry {
  id: number;
  created_at: string;
  acao: string;
  descricao: string;
  ip: string | null;
  user_agent: string | null;
  resultado: "sucesso" | "falha";
}

interface UserFormProps {
  values: UserFormValues;
  onChange: (values: UserFormValues) => void;
  perfis: PerfilOption[];
  editing: boolean;
  usuarioId: string | null;
  ultimoLogin?: string | null;
  ultimoIp?: string | null;
  onForcarLogout?: () => void;
}

export function UserForm({ values, onChange, perfis, editing, usuarioId, ultimoLogin, ultimoIp, onForcarLogout }: UserFormProps) {
  function set<K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) {
    onChange({ ...values, [field]: value });
  }

  // Operador de Produção novo (não edição) não vira linha em `usuarios` — vai
  // pra tabela `operadores` (mesma que dá login no tablet de cada máquina, ver
  // OperadoresTab.tsx). Por isso o formulário troca os campos irrelevantes
  // (e-mail, cargo, setor, telefone, páginas) por Matrícula/Máquina.
  const isOperadorNovo = !editing && values.perfil === "Operador";
  const [maquinas, setMaquinas] = useState<string[]>([]);

  useEffect(() => {
    if (!isOperadorNovo || maquinas.length > 0) return;
    supabase.from("maquinas").select("nome").order("nome").then(({ data }) => {
      if (data) setMaquinas(data.map((m: { nome: string }) => m.nome).filter(Boolean));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOperadorNovo]);

  // ── Aba Permissões: só mostra exceções (permissões extras além do perfil) ──
  const [catalogo, setCatalogo] = useState<PermissaoRow[]>([]);
  const [baseline, setBaseline] = useState<Set<number>>(new Set());
  const [excecoes, setExcecoes] = useState<Set<number>>(new Set());
  const [loadingPermissoes, setLoadingPermissoes] = useState(false);

  async function carregarPermissoes() {
    if (!usuarioId) return;
    setLoadingPermissoes(true);
    const perfilAtual = perfis.find((p) => p.nome === values.perfil);
    const [catalogoRes, baselineRes, excecoesRes] = await Promise.all([
      fetch("/api/permissoes").then((r) => r.json()).catch(() => ({ data: [] })),
      perfilAtual ? fetch(`/api/perfis/${perfilAtual.id}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      fetch(`/api/usuarios/${usuarioId}/permissoes`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setCatalogo(catalogoRes.data ?? []);
    setBaseline(new Set(baselineRes.data ?? []));
    const concedidas = (excecoesRes.data ?? []).filter((e: { tipo: string }) => e.tipo === "conceder").map((e: { permissoes: { id: number } }) => e.permissoes?.id).filter(Boolean);
    setExcecoes(new Set(concedidas));
    setLoadingPermissoes(false);
  }

  async function salvarExcecoes(next: Set<number>) {
    setExcecoes(next);
    if (!usuarioId) return;
    const res = await fetch(`/api/usuarios/${usuarioId}/permissoes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excecoes: Array.from(next).map((permissaoId) => ({ permissaoId, tipo: "conceder" })) }),
    });
    if (!res.ok) toast.error("Erro ao salvar permissões extras.");
    else toast.success("Permissões extras atualizadas.");
  }

  // ── Aba Histórico ──
  const [historico, setHistorico] = useState<AuditEntry[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  async function carregarHistorico() {
    if (!usuarioId) return;
    setLoadingHistorico(true);
    const res = await fetch(`/api/audit?usuarioId=${usuarioId}`);
    const json = await res.json().catch(() => ({ data: [] }));
    setHistorico(json.data ?? []);
    setLoadingHistorico(false);
  }

  const extrasDisponiveis = catalogo.filter((p) => !baseline.has(p.id));

  return (
    <Tabs defaultValue="informacoes" className="w-full">
      <TabsList className="mb-4 grid grid-cols-4 w-full">
        <TabsTrigger value="informacoes">Informações</TabsTrigger>
        <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        <TabsTrigger value="permissoes" onClick={carregarPermissoes} disabled={!editing}>Permissões</TabsTrigger>
        <TabsTrigger value="historico" onClick={carregarHistorico} disabled={!editing}>Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="informacoes" className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome completo *</Label>
          <Input value={values.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: João Silva" />
        </div>

        <div className="space-y-1.5">
          <Label>Perfil de acesso</Label>
          <Select value={values.perfil} onValueChange={(v) => set("perfil", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {perfis.map((p) => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {isOperadorNovo && (
            <p className="text-xs text-muted-foreground">
              Operador de produção não é um usuário web — vai para o cadastro que dá login no tablet de cada máquina.
            </p>
          )}
        </div>

        {isOperadorNovo ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Matrícula</Label>
                <Input value={values.matricula} onChange={(e) => set("matricula", e.target.value)} placeholder="Ex: 00123" />
              </div>
              <div className="space-y-1.5">
                <Label>Máquina</Label>
                <Select value={values.maquina ?? ""} onValueChange={(v) => set("maquina", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                  <SelectContent>
                    {maquinas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={values.status === "inativo" ? "inativo" : "ativo"}
                onValueChange={(v: UserFormValues["status"]) => set("status", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="joao@fabrica.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Matrícula</Label>
                <Input value={values.matricula} onChange={(e) => set("matricula", e.target.value)} placeholder="Ex: 00123" />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input value={values.cargo} onChange={(e) => set("cargo", e.target.value)} placeholder="Ex: Analista de Qualidade" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Input value={values.setor} onChange={(e) => set("setor", e.target.value)} placeholder="Ex: Produção" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={values.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: (11) 99999-0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v: UserFormValues["status"]) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>
                Páginas permitidas
                {values.perfil === "Administrador" && (
                  <span className="ml-2 text-xs text-muted-foreground">(Administrador acessa tudo)</span>
                )}
              </Label>
              <div className="space-y-3">
                {PAGE_GROUPS.map((group) => {
                  const ehAdmin = values.perfil === "Administrador";
                  return (
                    <div key={group.grupo}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group.grupo}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.pages.map((page) => {
                          const checked = ehAdmin || values.paginas.includes(page.id);
                          return (
                            <div key={page.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`page-${page.id}`}
                                checked={checked}
                                disabled={ehAdmin}
                                onCheckedChange={(c) => {
                                  set("paginas", c ? [...values.paginas, page.id] : values.paginas.filter((p) => p !== page.id));
                                }}
                              />
                              <label htmlFor={`page-${page.id}`} className="text-sm cursor-pointer select-none">{page.label}</label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="seguranca" className="space-y-4">
        <div className="space-y-1.5">
          <Label>{editing ? "Nova senha (deixe em branco para manter)" : isOperadorNovo ? "Senha do App *" : "Senha *"}</Label>
          <Input type="password" value={values.senha} onChange={(e) => set("senha", e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={values.deve_trocar_senha} onCheckedChange={(c) => set("deve_trocar_senha", !!c)} />
          Obrigar troca de senha no próximo login
        </label>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Autenticação em dois fatores</p>
                <p className="text-xs text-muted-foreground">Ainda não disponível nesta versão.</p>
              </div>
            </div>
            <Switch checked={false} disabled />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Laptop2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sessões ativas</p>
                <p className="text-xs text-muted-foreground">
                  Não há como listar sessão por dispositivo de forma suportada pela Supabase — "forçar logout" redefine a
                  senha e derruba todos os acessos ativos de uma vez.
                </p>
              </div>
            </div>
            {editing && onForcarLogout && (
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={onForcarLogout}>
                <LogOut className="h-3 w-3" /> Forçar logout
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <div className="border-t pt-4 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Último login: {ultimoLogin ? format(new Date(ultimoLogin), "dd/MM/yyyy HH:mm") : "Nunca acessou"}{ultimoIp ? ` · IP ${ultimoIp}` : ""}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="permissoes" className="space-y-3">
        {!editing ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Salve o usuário primeiro para configurar exceções de permissão.</p>
        ) : loadingPermissoes ? (
          <div className="flex items-center justify-center h-40"><SpinnerCustom /></div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Perfil: <span className="font-medium">{values.perfil}</span> — mostrando só permissões
              <span className="font-medium"> adicionais</span> além do que o perfil já concede.
            </p>
            {extrasDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Este perfil já tem todas as permissões do catálogo.</p>
            ) : (
              <PermissionTree catalogo={extrasDisponiveis} selecionadas={excecoes} onChange={salvarExcecoes} />
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="historico" className="space-y-2">
        {!editing ? (
          <p className="text-sm text-muted-foreground py-8 text-center">O histórico fica disponível depois de salvar o usuário.</p>
        ) : loadingHistorico ? (
          <div className="flex items-center justify-center h-40"><SpinnerCustom /></div>
        ) : historico.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {historico.map((h) => (
              <div key={h.id} className="rounded-lg border p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.descricao}</span>
                  <Badge variant="outline" className={h.resultado === "sucesso" ? "text-xs border-primary/30 text-primary bg-primary/5" : "text-xs border-destructive/30 text-destructive bg-destructive/5"}>
                    {h.resultado === "sucesso" ? "Sucesso" : "Falha"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")} · {h.ip ?? "—"} · {h.user_agent ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export const EMPTY_USER_FORM: UserFormValues = {
  nome: "", email: "", senha: "", perfil: "Visualizador", paginas: [], matricula: "", cargo: "", setor: "", telefone: "",
  status: "ativo", deve_trocar_senha: false, maquina: "",
};
