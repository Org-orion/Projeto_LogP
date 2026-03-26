import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, XCircle, AlertTriangle, Package, ClipboardCheck, Plus, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MaterialEntry {
  id: string;
  date: Date;
  material: string;
  lote: string;
  quantidade: number;
  unidade: string;
  fornecedor: string;
  verificado: boolean;
  conforme: boolean | null;
}

const INITIAL_MATERIALS: MaterialEntry[] = [
  { id: "1", date: new Date(2026, 2, 26), material: "MDF 15mm", lote: "L-2026-0341", quantidade: 120, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
  { id: "2", date: new Date(2026, 2, 26), material: "Cola PVA", lote: "L-2026-0342", quantidade: 50, unidade: "kg", fornecedor: "Henkel", verificado: true, conforme: false },
  { id: "3", date: new Date(2026, 2, 25), material: "Fita de Borda", lote: "L-2026-0338", quantidade: 300, unidade: "m", fornecedor: "Rehau", verificado: true, conforme: true },
  { id: "4", date: new Date(2026, 2, 25), material: "Dobradiça 35mm", lote: "L-2026-0339", quantidade: 500, unidade: "pcs", fornecedor: "Blum", verificado: false, conforme: null },
  { id: "5", date: new Date(2026, 2, 24), material: "Painel MDP 18mm", lote: "L-2026-0335", quantidade: 80, unidade: "chapas", fornecedor: "Duratex", verificado: true, conforme: true },
  { id: "6", date: new Date(2026, 2, 24), material: "Verniz PU", lote: "L-2026-0336", quantidade: 25, unidade: "L", fornecedor: "Sayerlack", verificado: true, conforme: false },
  { id: "7", date: new Date(2026, 2, 23), material: "Puxador Inox", lote: "L-2026-0330", quantidade: 200, unidade: "pcs", fornecedor: "Hafele", verificado: false, conforme: null },
  { id: "8", date: new Date(2026, 2, 20), material: "MDF 6mm", lote: "L-2026-0325", quantidade: 60, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
];

const EMPTY_FORM = {
  material: "",
  lote: "",
  quantidade: "",
  unidade: "pcs",
  fornecedor: "",
  verificado: "pendente" as "pendente" | "conforme" | "nao_conforme",
  date: new Date(),
};

export default function QualidadePage() {
  const [materials, setMaterials] = useState<MaterialEntry[]>(INITIAL_MATERIALS);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const naoConformes = materials.filter((m) => m.conforme === false);
  const pendentes = materials.filter((m) => !m.verificado);
  const totalRecebidos = materials.length;

  const entriesForDate = selectedDate
    ? materials.filter((m) => format(m.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"))
    : [];

  const modifiers = { hasEntries: materials.map((m) => m.date) };
  const modifiersStyles = {
    hasEntries: {
      fontWeight: 700 as const,
      textDecoration: "underline" as const,
      textDecorationColor: "hsl(var(--primary))" as const,
      textUnderlineOffset: "4px" as const,
    },
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (entry: MaterialEntry) => {
    setEditingId(entry.id);
    setForm({
      material: entry.material,
      lote: entry.lote,
      quantidade: String(entry.quantidade),
      unidade: entry.unidade,
      fornecedor: entry.fornecedor,
      verificado: entry.conforme === null ? "pendente" : entry.conforme ? "conforme" : "nao_conforme",
      date: entry.date,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    toast.success("Material removido com sucesso.");
  };

  const handleSave = () => {
    if (!form.material.trim() || !form.lote.trim() || !form.quantidade || !form.fornecedor.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const qty = Number(form.quantidade);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }

    const verificado = form.verificado !== "pendente";
    const conforme = form.verificado === "pendente" ? null : form.verificado === "conforme";

    if (editingId) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? { ...m, material: form.material.trim(), lote: form.lote.trim(), quantidade: qty, unidade: form.unidade, fornecedor: form.fornecedor.trim(), verificado, conforme, date: form.date }
            : m
        )
      );
      toast.success("Material atualizado com sucesso.");
    } else {
      const newEntry: MaterialEntry = {
        id: crypto.randomUUID(),
        date: form.date,
        material: form.material.trim(),
        lote: form.lote.trim(),
        quantidade: qty,
        unidade: form.unidade,
        fornecedor: form.fornecedor.trim(),
        verificado,
        conforme,
      };
      setMaterials((prev) => [newEntry, ...prev]);
      toast.success("Material adicionado com sucesso.");
    }

    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalRecebidos}</p>
              <p className="text-xs text-muted-foreground">Materiais Recebidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{naoConformes.length}</p>
              <p className="text-xs text-muted-foreground">Não Conformes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
              <p className="text-xs text-muted-foreground">Pendentes de Verificação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Calendário de Recebimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="pointer-events-auto"
            />
            {selectedDate && entriesForDate.length > 0 && (
              <div className="w-full mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </p>
                {entriesForDate.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.material}</p>
                      <p className="text-xs text-muted-foreground">
                        Lote: {entry.lote} · {entry.quantidade} {entry.unidade}
                      </p>
                    </div>
                    {entry.verificado ? (
                      entry.conforme ? (
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Conforme
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">
                          <XCircle className="h-3 w-3 mr-1" /> Não Conforme
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedDate && entriesForDate.length === 0 && (
              <p className="text-xs text-muted-foreground mt-4">Nenhum recebimento nesta data.</p>
            )}
          </CardContent>
        </Card>

        {/* Non-conforming materials table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Materiais Não Conformes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {naoConformes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum material não conforme registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {naoConformes.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{m.material}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                      <TableCell>{m.quantidade} {m.unidade}</TableCell>
                      <TableCell>{m.fornecedor}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">Não Conforme</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full materials table with add/edit/delete */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Todos os Recebimentos
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar Material
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">{m.material}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                  <TableCell>{m.quantidade} {m.unidade}</TableCell>
                  <TableCell>{m.fornecedor}</TableCell>
                  <TableCell>
                    {m.verificado ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </TableCell>
                  <TableCell>
                    {m.conforme === null ? (
                      <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    ) : m.conforme ? (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Não Conforme</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Material" : "Adicionar Material"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-material">Material *</Label>
                <Input id="mat-material" placeholder="Ex: MDF 15mm" maxLength={100} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-lote">Lote *</Label>
                <Input id="mat-lote" placeholder="Ex: L-2026-0341" maxLength={50} value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-qtd">Quantidade *</Label>
                <Input id="mat-qtd" type="number" min="1" placeholder="0" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Peças</SelectItem>
                    <SelectItem value="chapas">Chapas</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="L">Litros</SelectItem>
                    <SelectItem value="m">Metros</SelectItem>
                    <SelectItem value="m2">m²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(form.date, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={(d) => { if (d) { setForm({ ...form, date: d }); setDatePickerOpen(false); } }}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-forn">Fornecedor *</Label>
                <Input id="mat-forn" placeholder="Ex: Eucatex" maxLength={100} value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Verificação de Qualidade</Label>
                <Select value={form.verificado} onValueChange={(v: "pendente" | "conforme" | "nao_conforme") => setForm({ ...form, verificado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
