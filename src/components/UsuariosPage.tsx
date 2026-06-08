"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Users, HardHat, Eye, EyeOff, Search, BookUser } from "lucide-react";
import { toast } from "sonner";

// ─── Tipos ──────────────────────────────────────────────────────────────────

const ALL_PAGES = [
  { id: "home",            label: "Home" },
  { id: "machines",        label: "Máquinas" },
  { id: "rastreabilidade", label: "Rastreabilidade" },
  { id: "pedidos",         label: "Pedidos" },
  { id: "metas",           label: "Metas de Produção" },
  { id: "qualidade",       label: "Controle de Qualidade" },
  { id: "material-fsc",    label: "Material Certificado (FSC)" },
  { id: "auditorias",      label: "Auditorias" },
  { id: "relatorios",      label: "Relatórios" },
  { id: "registros",       label: "Registros" },
  { id: "usuarios",        label: "Usuários" },
  { id: "configuracoes",   label: "Configurações" },
  { id: "ajuda",           label: "Ajuda" },
];

interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

interface Operador {
  id: number;
  nome: string;
  matricula?: string;
  maquina?: string;
  ativo?: boolean;
  senha?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 gap-2 text-destructive">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
}

// ─── Aba Usuários Web ────────────────────────────────────────────────────────

const PERFIS = ["Administrador", "Supervisor", "Operador", "Visualizador"];

const EMPTY_USUARIO = { nome: "", email: "", senha: "", perfil: "Visualizador", paginas: ["home"] as string[] };
// senha: campo auxiliar de formulário apenas; nunca armazenado no estado de lista

function UsuariosWebTab({ isAdmin }: { isAdmin: boolean }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_USUARIO);

  async function fetchUsuarios() {
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/usuarios");
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        // Sessão expirada — força logout
        localStorage.removeItem("logp_user");
        localStorage.removeItem("logp_section");
        window.location.reload();
      } else {
        setErro(json.error ?? "Erro ao carregar usuários.");
      }
    } else {
      setUsuarios(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsuarios(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_USUARIO);
    setDialogOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditingId(u.id);
    setForm({ nome: u.nome, email: u.email, senha: "", perfil: u.perfil ?? "Visualizador", paginas: u.paginas ?? ["home"] });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (editingId === null && !form.senha.trim()) {
      toast.error("Informe a senha para o novo usuário.");
      return;
    }
    setSaving(true);
    const isAdminPerfil = form.perfil === "Administrador";
    const paginasSalvar = isAdminPerfil ? ALL_PAGES.map((p) => p.id) : form.paginas;
    const payload = { nome: form.nome.trim(), email: form.email.trim(), senha: form.senha.trim(), perfil: form.perfil, paginas: paginasSalvar };

    const res = editingId !== null
      ? await fetch(`/api/usuarios/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    const json = await res.json();
    if (!res.ok) {
      toast.error((editingId !== null ? "Erro ao atualizar: " : "Erro ao cadastrar: ") + (json.error ?? "erro desconhecido"));
    } else {
      toast.success(editingId !== null ? "Usuário atualizado." : "Usuário cadastrado.");
      setDialogOpen(false);
      fetchUsuarios();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    const res = await fetch(`/api/usuarios/${deleteId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) toast.error("Erro ao excluir: " + (json.error ?? "erro desconhecido"));
    else { toast.success("Usuário removido."); fetchUsuarios(); }
    setDeleteId(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Usuários do Sistema Web
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={openAdd} className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingState /> : erro ? <ErrorState message={erro} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-10">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.perfil ? (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                          {u.perfil}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input placeholder="Ex: João Silva" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="joao@fabrica.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{editingId !== null ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label>
              <Input type="password" placeholder="••••••••" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.perfil} onValueChange={(v) => setForm({ ...form, perfil: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Páginas permitidas
                {form.perfil === "Administrador" && (
                  <span className="ml-2 text-xs text-muted-foreground">(Administrador acessa tudo)</span>
                )}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PAGES.map((page) => {
                  const perfisAdmin = form.perfil === "Administrador";
                  const checked = perfisAdmin || form.paginas.includes(page.id);
                  return (
                    <div key={page.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`page-${page.id}`}
                        checked={checked}
                        disabled={perfisAdmin}
                        onCheckedChange={(c) => {
                          setForm((prev) => ({
                            ...prev,
                            paginas: c
                              ? [...prev.paginas, page.id]
                              : prev.paginas.filter((p) => p !== page.id),
                          }));
                        }}
                      />
                      <label htmlFor={`page-${page.id}`} className="text-sm cursor-pointer select-none">
                        {page.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId !== null ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Aba Operadores ──────────────────────────────────────────────────────────

const EMPTY_OPERADOR = { nome: "", matricula: "", maquina: "", ativo: true, senha: "" };

function OperadoresTab() {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [maquinas, setMaquinas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_OPERADOR);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<number>>(new Set());
  const [senhaDialogVisivel, setSenhaDialogVisivel] = useState(false);

  async function fetchMaquinas() {
    const { data } = await supabase.from("maquinas").select("nome").order("nome");
    if (data) setMaquinas(data.map((m: { nome: string }) => m.nome).filter(Boolean));
  }

  async function fetchOperadores() {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.from("operadores").select("*").order("id");
    if (error) setErro(error.message);
    else setOperadores(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchOperadores(); fetchMaquinas(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_OPERADOR);
    setDialogOpen(true);
  }

  function toggleSenhaVisivel(id: number) {
    setSenhasVisiveis((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openEdit(o: Operador) {
    setEditingId(o.id);
    setForm({ nome: o.nome, matricula: o.matricula ?? "", maquina: o.maquina ?? "", ativo: o.ativo ?? true, senha: o.senha ?? "" });
    setSenhaDialogVisivel(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error("O nome do operador é obrigatório.");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      matricula: form.matricula.trim() || null,
      maquina: form.maquina || null,
      ativo: form.ativo,
      senha: form.senha.trim() || null,
    };
    if (editingId !== null) {
      const { error } = await supabase.from("operadores").update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar: " + error.message); }
      else { toast.success("Operador atualizado."); setDialogOpen(false); fetchOperadores(); }
    } else {
      const { error } = await supabase.from("operadores").insert(payload);
      if (error) { toast.error("Erro ao cadastrar: " + error.message); }
      else { toast.success("Operador cadastrado."); setDialogOpen(false); fetchOperadores(); }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    const { error } = await supabase.from("operadores").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Operador removido."); fetchOperadores(); }
    setDeleteId(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HardHat className="h-4 w-4 text-primary" />
              Operadores de Produção
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Operador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingState /> : erro ? <ErrorState message={erro} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Senha App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operadores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Nenhum operador cadastrado.
                    </TableCell>
                  </TableRow>
                ) : operadores.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{o.matricula ?? "—"}</TableCell>
                    <TableCell>{o.maquina ?? "—"}</TableCell>
                    <TableCell>
                      {o.senha ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">
                            {senhasVisiveis.has(o.id) ? o.senha : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleSenhaVisivel(o.id)}
                          >
                            {senhasVisiveis.has(o.id)
                              ? <EyeOff className="h-3.5 w-3.5" />
                              : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.ativo ? (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(o.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Editar Operador" : "Novo Operador"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input placeholder="Ex: Carlos Oliveira" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Matrícula</Label>
                <Input placeholder="Ex: 00123" autoComplete="off" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.ativo ? "true" : "false"} onValueChange={(v) => setForm({ ...form, ativo: v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Máquina</Label>
              <Select value={form.maquina} onValueChange={(v) => setForm({ ...form, maquina: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                <SelectContent>
                  {maquinas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Senha do App</Label>
              <div className="relative">
                <Input
                  type={senhaDialogVisivel ? "text" : "password"}
                  placeholder="Senha para login no aplicativo"
                  autoComplete="new-password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSenhaDialogVisivel((v) => !v)}
                >
                  {senhaDialogVisivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId !== null ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir operador?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Aba Funcionários ────────────────────────────────────────────────────────

interface Funcionario {
  id: number;
  matricula: string;
  nome_completo: string;
  maquina?: string;
  setor?: string;
  categoria?: string;
  dias_trabalhados?: string;
  ativo: boolean;
}

function FuncionariosTab() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("todos");

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("base_funcionarios")
        .select("id, matricula, nome_completo, maquina, setor, categoria, dias_trabalhados, ativo")
        .order("nome_completo");
      if (error) setErro(error.message);
      else setFuncionarios(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const setores = Array.from(new Set(funcionarios.map((f) => f.setor ?? "").filter(Boolean))).sort();

  const filtrados = funcionarios.filter((f) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      !busca ||
      f.nome_completo.toLowerCase().includes(termo) ||
      f.matricula.includes(termo) ||
      (f.maquina ?? "").toLowerCase().includes(termo);
    const matchSetor = setorFiltro === "todos" || f.setor === setorFiltro;
    return matchBusca && matchSetor;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookUser className="h-4 w-4 text-primary" />
            Base de Funcionários
            <Badge variant="secondary" className="ml-1">{funcionarios.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, matrícula ou máquina..."
                className="pl-8 h-8 w-64 text-sm"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={setorFiltro} onValueChange={setSetorFiltro}>
              <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : erro ? <ErrorState message={erro} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Máquina / Setor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Dias Trab.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhum funcionário encontrado.
                  </TableCell>
                </TableRow>
              ) : filtrados.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-sm">{f.matricula}</TableCell>
                  <TableCell className="font-medium">{f.nome_completo}</TableCell>
                  <TableCell>
                    <div className="text-sm">{f.maquina ?? "—"}</div>
                    {f.setor && f.setor !== f.maquina && (
                      <div className="text-xs text-muted-foreground">{f.setor}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.categoria ?? "—"}</TableCell>
                  <TableCell className="text-sm">{f.dias_trabalhados ?? "—"}</TableCell>
                  <TableCell>
                    {f.ativo
                      ? <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Ativo</Badge>
                      : <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function UsuariosPage({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className="w-full space-y-4">
      <Tabs defaultValue="funcionarios">
        <TabsList className="mb-4">
          <TabsTrigger value="funcionarios" className="gap-2">
            <BookUser className="h-4 w-4" /> Funcionários
          </TabsTrigger>
          <TabsTrigger value="operadores" className="gap-2">
            <HardHat className="h-4 w-4" /> Operadores
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" /> Usuários Web
          </TabsTrigger>
        </TabsList>
        <TabsContent value="funcionarios">
          <FuncionariosTab />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsuariosWebTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="operadores">
          <OperadoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
