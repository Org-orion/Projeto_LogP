"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { PlanoAcao, Metodologia, PlanoStatus, Eficacia, AcaoItem } from "@/components/qualidade/ActionPlanTable";
import { METODOLOGIA_LABELS } from "@/components/qualidade/ActionPlanTable";

export type PlanoAcaoFormValues = Omit<PlanoAcao, "id" | "numero">;

interface ActionPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: PlanoAcaoFormValues;
  editing: boolean;
  saving?: boolean;
  onSave: (values: PlanoAcaoFormValues) => void;
}

const STATUS_OPTIONS: { value: PlanoStatus; label: string }[] = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

const EFICACIA_OPTIONS: { value: Eficacia; label: string }[] = [
  { value: "nao_avaliada", label: "Não avaliada" },
  { value: "eficaz", label: "Eficaz" },
  { value: "ineficaz", label: "Ineficaz" },
];

export function ActionPlanForm({ open, onOpenChange, initialValues, editing, saving, onSave }: ActionPlanFormProps) {
  const [values, setValues] = useState<PlanoAcaoFormValues>(initialValues);

  useEffect(() => { if (open) setValues(initialValues); }, [open, initialValues]);

  function set<K extends keyof PlanoAcaoFormValues>(field: K, value: PlanoAcaoFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function addAcao() {
    set("itens", [...values.itens, { id: `acao-${values.itens.length}`, descricao: "", responsavel: "", prazo: format(new Date(), "yyyy-MM-dd"), status: "pendente" }]);
  }

  function updateAcao(id: string, patch: Partial<AcaoItem>) {
    set("itens", values.itens.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={values.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Reduzir refugo de gramatura fora da faixa" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Origem</Label>
            <Input value={values.origem} onChange={(e) => set("origem", e.target.value)} placeholder="Ex.: RNC 12/26, Inspeção 0034" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Metodologia</Label>
              <Select value={values.metodologia} onValueChange={(v: Metodologia) => set("metodologia", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(METODOLOGIA_LABELS) as Metodologia[]).map((m) => (
                    <SelectItem key={m} value={m}>{METODOLOGIA_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Input value={values.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Prazo</Label>
              <Input type="date" value={values.prazo} onChange={(e) => set("prazo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={values.status} onValueChange={(v: PlanoStatus) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Progresso (%)</Label>
              <Input type="number" min="0" max="100" value={values.progresso} onChange={(e) => set("progresso", Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ações ({METODOLOGIA_LABELS[values.metodologia]})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAcao} className="gap-1.5 h-7">
                <Plus className="h-3.5 w-3.5" /> Adicionar ação
              </Button>
            </div>
            <div className="space-y-2">
              {values.itens.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end rounded-lg border p-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Descrição</Label>
                    <Input value={item.descricao} onChange={(e) => updateAcao(item.id, { descricao: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1 w-32">
                    <Label className="text-[10px] text-muted-foreground">Responsável</Label>
                    <Input value={item.responsavel} onChange={(e) => updateAcao(item.id, { responsavel: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1 w-32">
                    <Label className="text-[10px] text-muted-foreground">Prazo</Label>
                    <Input type="date" value={item.prazo} onChange={(e) => updateAcao(item.id, { prazo: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <button type="button" onClick={() => set("itens", values.itens.filter((a) => a.id !== item.id))} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validação de Eficácia</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Critério de Eficácia</Label>
              <Textarea rows={2} value={values.criterioEficacia} onChange={(e) => set("criterioEficacia", e.target.value)}
                placeholder="Ex.: 0 recorrências da mesma NC nos 60 dias seguintes" className="resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Resultado</Label>
                <Select value={values.eficacia} onValueChange={(v: Eficacia) => set("eficacia", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EFICACIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Verificação</Label>
                <Input type="date" value={values.dataVerificacaoEficacia} onChange={(e) => set("dataVerificacaoEficacia", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Avaliador</Label>
                <Input value={values.avaliador} onChange={(e) => set("avaliador", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={() => onSave(values)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Salvar Alterações" : "Criar Plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
