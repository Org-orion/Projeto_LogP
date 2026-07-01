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

const PRODUTO_OPCOES: Record<string, string[]> = {
  "Batente":   ["5,5","6,5","7,5","8,5","10","12","14","15","18","21"],
  "Alizar":    ["5x2","5x5","5x7","5x9","5x10","7x2","7x5","7x7","7x9","7x10","10x2","10x5","10x7","10x9","10x10"],
  "S. Correr": ["5x4,5"],
  "Régua":     ["10","5"],
  "Rodapé":    ["10,2","7,2","5,2"],
  "Alongador": ["2,5","2"],
};

interface FormState {
  data: string;
  hora_inicial: string;
  hora_final: string;
  produto_tipo: string;
  produto_largura: string;
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
  produto_tipo: "",
  produto_largura: "",
  modelo_batente: "",
  unidade: "pç",
  material_certificado_fsc: "Sim",
  padrao: "",
  comprimento_cm: "",
  largura_cm: "",
  espessura_mm: "",
  dim_cabeceira_alizar_cm: "",
  largura_rebaixo_bat_mm: "",
  prof_rebaixo_bat_mm: "",
  qualidade_visual_final: "Aprovado",
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
      produto:                  form.produto_tipo || null,
      largura_perfil:           form.produto_largura || null,
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

          {/* Linha 2: Tipo produto + Largura + Modelo batente + Unid. */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Produto</Label>
              <Select
                value={form.produto_tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, produto_tipo: v, produto_largura: "" }))}
              >
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(PRODUTO_OPCOES).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Largura</Label>
              <Select
                value={form.produto_largura}
                onValueChange={(v) => set("produto_largura", v)}
                disabled={!form.produto_tipo}
              >
                <SelectTrigger className="text-sm"><SelectValue placeholder={form.produto_tipo ? "Selecione…" : "—"} /></SelectTrigger>
                <SelectContent>
                  {(PRODUTO_OPCOES[form.produto_tipo] ?? []).map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
              <Select value={form.padrao} onValueChange={(v) => set("padrao", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Curupixá">Curupixá</SelectItem>
                  <SelectItem value="Elo Curupixá">Elo Curupixá</SelectItem>
                  <SelectItem value="Elo Branco">Elo Branco</SelectItem>
                  <SelectItem value="Marfim">Marfim</SelectItem>
                  <SelectItem value="Velar">Velar</SelectItem>
                  <SelectItem value="Fendi">Fendi</SelectItem>
                  <SelectItem value="Grafite">Grafite</SelectItem>
                  <SelectItem value="Blue">Blue</SelectItem>
                  <SelectItem value="Nero">Nero</SelectItem>
                  <SelectItem value="Capuccino">Capuccino</SelectItem>
                  <SelectItem value="Urban">Urban</SelectItem>
                  <SelectItem value="Mocaccino">Mocaccino</SelectItem>
                  <SelectItem value="Carvalho">Carvalho</SelectItem>
                  <SelectItem value="MTX PROTECT+">MTX PROTECT+</SelectItem>
                  <SelectItem value="MTX">MTX</SelectItem>
                  <SelectItem value="Lacca PET">Lacca PET</SelectItem>
                  <SelectItem value="Imbuia">Imbuia</SelectItem>
                  <SelectItem value="Freijó Natural">Freijó Natural</SelectItem>
                  <SelectItem value="Green">Green</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 4: Dimensões do produto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões do Produto</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Comprimento (cm)</Label>
                <Input value={form.comprimento_cm} onChange={(e) => set("comprimento_cm", e.target.value)} placeholder="0,00" inputMode="decimal" className="text-sm" />
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
