"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SpinnerCustom } from "@/components/ui/spinner";
import { useCusteioInsumosCatalogo, type CusteioInsumoCatalogo } from "@/hooks/useCusteioInsumosCatalogo";

function LinhaPreco({ id, valor, onSalvar }: { id: string; valor: number; onSalvar: (id: string, valor: number) => Promise<void> }) {
  const [texto, setTexto] = useState(String(valor));

  async function salvar() {
    const numero = Number(texto.replace(",", "."));
    if (!Number.isFinite(numero) || numero === valor) { setTexto(String(valor)); return; }
    await onSalvar(id, numero);
  }

  return (
    <Input
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="ml-auto h-8 w-28 text-right tabular-nums"
    />
  );
}

interface CusteioEditarInsumoDialogProps {
  insumo: CusteioInsumoCatalogo | null;
  onOpenChange: (open: boolean) => void;
  onSalvar: (id: string, campos: { tipo: string; produto: string; unidade: string; preco_atual: number }) => Promise<{ error: { message: string } | null }>;
}

function CusteioEditarInsumoDialog({ insumo, onOpenChange, onSalvar }: CusteioEditarInsumoDialogProps) {
  const [campos, setCampos] = useState({ tipo: "", produto: "", unidade: "", preco_atual: "" });
  const [salvando, setSalvando] = useState(false);

  // Reseta o formulário sempre que um insumo diferente é aberto pra edição.
  const idAtual = insumo?.id;
  const [idCarregado, setIdCarregado] = useState<string | undefined>(undefined);
  if (insumo && idAtual !== idCarregado) {
    setCampos({ tipo: insumo.tipo, produto: insumo.produto, unidade: insumo.unidade, preco_atual: String(insumo.preco_atual) });
    setIdCarregado(idAtual);
  }

  async function salvar() {
    if (!insumo) return;
    const precoNumero = Number(campos.preco_atual.replace(",", "."));
    if (!campos.tipo.trim() || !campos.produto.trim() || !campos.unidade.trim() || !Number.isFinite(precoNumero)) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setSalvando(true);
    const { error } = await onSalvar(insumo.id, {
      tipo: campos.tipo.trim(), produto: campos.produto.trim(), unidade: campos.unidade.trim(), preco_atual: precoNumero,
    });
    setSalvando(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else { toast.success("Insumo atualizado."); onOpenChange(false); }
  }

  return (
    <Dialog open={insumo !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar insumo</DialogTitle>
          <DialogDescription>Tipo + Produto formam a chave que o motor usa pra achar o preço — cuidado ao renomear.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Input value={campos.tipo} onChange={(e) => setCampos((c) => ({ ...c, tipo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Input value={campos.produto} onChange={(e) => setCampos((c) => ({ ...c, produto: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Input value={campos.unidade} onChange={(e) => setCampos((c) => ({ ...c, unidade: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Preço Atual (R$/un)</Label>
            <Input value={campos.preco_atual} onChange={(e) => setCampos((c) => ({ ...c, preco_atual: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CusteioCatalogoInsumos() {
  const { data, loading, atualizarPreco, atualizarAtivo, atualizarInsumo } = useCusteioInsumosCatalogo();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [editando, setEditando] = useState<CusteioInsumoCatalogo | null>(null);

  const tipos = useMemo(() => [...new Set(data.map((i) => i.tipo))].sort(), [data]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return data.filter((i) => {
      if (tipoFiltro !== "todos" && i.tipo !== tipoFiltro) return false;
      if (!termo) return true;
      return i.produto.toLowerCase().includes(termo) || i.tipo.toLowerCase().includes(termo);
    });
  }, [data, busca, tipoFiltro]);

  async function handleSalvarPreco(id: string, valor: number) {
    const { error } = await atualizarPreco(id, valor);
    if (error) toast.error("Erro ao salvar preço: " + error.message);
    else toast.success("Preço atualizado.");
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    const { error } = await atualizarAtivo(id, ativo);
    if (error) toast.error("Erro ao atualizar: " + error.message);
    else toast.success(ativo ? "Insumo reativado." : "Insumo desativado.");
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><SpinnerCustom /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Catálogo de Insumos</CardTitle>
          <CardDescription>Preço em uso pelo motor de cálculo — edite direto aqui, reflete no próximo cálculo.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar insumo..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-[200px] pl-8" />
          </div>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[calc(100vh-260px)] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Preço Atual (R$/un)</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((i) => (
                <TableRow key={i.id} className={i.ativo ? "" : "opacity-50"}>
                  <TableCell>{i.tipo}</TableCell>
                  <TableCell className="font-medium">{i.produto}</TableCell>
                  <TableCell className="text-muted-foreground">{i.unidade}</TableCell>
                  <TableCell className="text-right">
                    <LinhaPreco id={i.id} valor={i.preco_atual} onSalvar={handleSalvarPreco} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title="Editar insumo"
                        onClick={() => setEditando(i)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title={i.ativo ? "Desativar insumo" : "Reativar insumo"}
                        onClick={() => handleToggleAtivo(i.id, !i.ativo)}
                      >
                        {i.ativo ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CusteioEditarInsumoDialog
        insumo={editando}
        onOpenChange={(open) => !open && setEditando(null)}
        onSalvar={atualizarInsumo}
      />
    </Card>
  );
}
