"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface FormState {
  data: string;
  hora_inicial: string;
  hora_final: string;
  produto: string;
  modelo_batente: string;
  unidade: string;
  material_certificado_fsc: string;
  padrao: string;
  comprimento_cm: string;
  largura_cm: string;
  espessura_mm: string;
  dim_cabeceira_alizar_cm: string;
  largura_rebaixo_bat_mm: string;
  prof_rebaixo_bat_mm: string;
  qualidade_visual_final: string;
  qtd_conforme: string;
  qtd_nao_conforme_1: string;
  tipo_defeito_1: string;
}

const EMPTY: FormState = {
  data: format(new Date(), "yyyy-MM-dd"),
  hora_inicial: "",
  hora_final: "",
  produto: "",
  modelo_batente: "",
  unidade: "pç",
  material_certificado_fsc: "",
  padrao: "",
  comprimento_cm: "",
  largura_cm: "",
  espessura_mm: "",
  dim_cabeceira_alizar_cm: "",
  largura_rebaixo_bat_mm: "",
  prof_rebaixo_bat_mm: "",
  qualidade_visual_final: "",
  qtd_conforme: "",
  qtd_nao_conforme_1: "",
  tipo_defeito_1: "",
};

function num(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

export default function EmbalagemPerfilForm({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleClose() {
    setForm(EMPTY);
    onClose();
  }

  async function handleSalvar() {
    if (!form.data) { toast.error("Informe a data"); return; }
    if (!form.qtd_conforme) { toast.error("Informe a quantidade conforme"); return; }

    setSaving(true);
    const { error } = await supabase.from("registros_producao").insert({
      maquina:                  "EMBALAGEM DE PERFIL",
      data:                     form.data,
      hora_inicial:             form.hora_inicial || null,
      hora_final:               form.hora_final || null,
      produto:                  form.produto || null,
      modelo_batente:           form.modelo_batente || null,
      unidade:                  form.unidade || null,
      material_certificado_fsc: form.material_certificado_fsc || null,
      padrao:                   form.padrao || null,
      comprimento_cm:           num(form.comprimento_cm),
      largura_cm:               num(form.largura_cm),
      espessura_mm:             num(form.espessura_mm),
      dim_cabeceira_alizar_cm:  num(form.dim_cabeceira_alizar_cm),
      largura_rebaixo_bat_mm:   num(form.largura_rebaixo_bat_mm),
      prof_rebaixo_bat_mm:      num(form.prof_rebaixo_bat_mm),
      qualidade_visual_final:   form.qualidade_visual_final || null,
      qtd_conforme:             num(form.qtd_conforme),
      qtd_nao_conforme_1:       num(form.qtd_nao_conforme_1),
      tipo_defeito_1:           form.tipo_defeito_1 || null,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    toast.success("Produção registrada com sucesso!");
    setForm(EMPTY);
    onSaved?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Lançar Produção — EMBALAGEM DE PERFIL
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">

          {/* Linha 1: Data + Horas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hora Inicial</Label>
              <Input type="time" value={form.hora_inicial} onChange={(e) => set("hora_inicial", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hora Final</Label>
              <Input type="time" value={form.hora_final} onChange={(e) => set("hora_final", e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Linha 2: Produto + Modelo do batente + Unid. */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs">Produto</Label>
              <Input value={form.produto} onChange={(e) => set("produto", e.target.value)} placeholder="Ex: Alizar 7cm" className="text-sm" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs">Modelo do Batente</Label>
              <Input value={form.modelo_batente} onChange={(e) => set("modelo_batente", e.target.value)} placeholder="Ex: 7cm Rebaixado" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unid.</Label>
              <Select value={form.unidade} onValueChange={(v) => set("unidade", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pç">pç</SelectItem>
                  <SelectItem value="par">par</SelectItem>
                  <SelectItem value="jogo">jogo</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 3: Material FSC + Padrão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Material Certificado (FSC)</Label>
              <Select value={form.material_certificado_fsc} onValueChange={(v) => set("material_certificado_fsc", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Padrão</Label>
              <Input value={form.padrao} onChange={(e) => set("padrao", e.target.value)} placeholder="Ex: Branco TX" className="text-sm" />
            </div>
          </div>

          {/* Linha 4: Dimensões do produto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões do Produto</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Comprimento (cm)</Label>
                <Input value={form.comprimento_cm} onChange={(e) => set("comprimento_cm", e.target.value)} placeholder="0,00" inputMode="decimal" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Largura (cm)</Label>
                <Input value={form.largura_cm} onChange={(e) => set("largura_cm", e.target.value)} placeholder="0,00" inputMode="decimal" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Espessura (mm)</Label>
                <Input value={form.espessura_mm} onChange={(e) => set("espessura_mm", e.target.value)} placeholder="0,0" inputMode="decimal" className="text-sm" />
              </div>
            </div>
          </div>

          {/* Linha 5: Dimensões do alizar / batente */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rebaixo do Batente</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Dim. Cabeceira do Alizar (cm)</Label>
                <Input value={form.dim_cabeceira_alizar_cm} onChange={(e) => set("dim_cabeceira_alizar_cm", e.target.value)} placeholder="0,00" inputMode="decimal" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Largura do Rebaixo (mm)</Label>
                <Input value={form.largura_rebaixo_bat_mm} onChange={(e) => set("largura_rebaixo_bat_mm", e.target.value)} placeholder="0,0" inputMode="decimal" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profundidade do Rebaixo (mm)</Label>
                <Input value={form.prof_rebaixo_bat_mm} onChange={(e) => set("prof_rebaixo_bat_mm", e.target.value)} placeholder="0,0" inputMode="decimal" className="text-sm" />
              </div>
            </div>
          </div>

          {/* Linha 6: Qualidade + Quantidades */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado</Label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Qualidade Visual Final</Label>
                <Select value={form.qualidade_visual_final} onValueChange={(v) => set("qualidade_visual_final", v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                    <SelectItem value="Reprovado">Reprovado</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qtd. Conforme <span className="text-destructive">*</span></Label>
                <Input value={form.qtd_conforme} onChange={(e) => set("qtd_conforme", e.target.value)} placeholder="0" inputMode="numeric" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qtd. Não Conforme</Label>
                <Input value={form.qtd_nao_conforme_1} onChange={(e) => set("qtd_nao_conforme_1", e.target.value)} placeholder="0" inputMode="numeric" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Defeito</Label>
                <Input value={form.tipo_defeito_1} onChange={(e) => set("tipo_defeito_1", e.target.value)} placeholder="Descreva…" className="text-sm" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSalvar} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Salvar Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
