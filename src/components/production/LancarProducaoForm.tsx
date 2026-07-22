"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getColunasParaMaquina } from "./colunasMaquina";
import type { Maquina } from "./types";

interface Props {
  maquina: Maquina | null;
  onClose: () => void;
  onSaved?: () => void;
}

// Formulário genérico de lançamento manual — usa o mesmo mapa de colunas por
// tipo de máquina (colunasMaquina.ts) já usado pra ver/editar histórico em
// HistoricoSheet.tsx, então os campos aqui sempre batem com os que aparecem
// lá. Pensado pra qualquer máquina que não tenha um formulário dedicado (ver
// EmbalagemPerfilForm.tsx, que continua existindo à parte pra Embalagem de Perfil).
export function LancarProducaoForm({ maquina, onClose, onSaved }: Props) {
  const colunas = getColunasParaMaquina(maquina?.nome ?? "");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reseta o formulário (data de hoje, resto vazio) sempre que abre pra uma máquina.
  useEffect(() => {
    if (!maquina) return;
    const inicial: Record<string, string> = {};
    for (const col of colunas) inicial[col.key] = col.key === "data" ? format(new Date(), "yyyy-MM-dd") : "";
    setForm(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maquina?.id]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSalvar() {
    if (!maquina) return;
    if (!form.data) { toast.error("Informe a data."); return; }
    if (!form.qtd_conforme?.trim()) { toast.error("Informe a quantidade conforme."); return; }

    setSaving(true);
    const payload: Record<string, unknown> = { maquina: maquina.nome };
    for (const col of colunas) {
      if (col.key === "maquina") continue; // já fixado acima com o nome exato da máquina
      const raw = form[col.key];
      if (col.numeric) {
        payload[col.key] = raw === undefined || raw === "" ? null : Number(raw);
      } else {
        payload[col.key] = raw === undefined || raw === "" ? null : raw;
      }
    }

    const { error } = await supabase.from("registros_producao").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    toast.success("Produção registrada com sucesso!");
    onSaved?.();
    onClose();
  }

  if (!maquina) return null;

  return (
    <Dialog open={!!maquina} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Lançar Produção — {maquina.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
          {colunas.filter((col) => col.key !== "maquina").map((col) => {
            const inputType = col.date
              ? "date"
              : (col.key === "hora_inicial" || col.key === "hora_final")
                ? "time"
                : col.numeric
                  ? "number"
                  : "text";
            const obrigatorio = col.key === "data" || col.key === "qtd_conforme";
            return (
              <div key={col.key} className="space-y-1.5">
                <Label className="text-xs">
                  {col.label} {obrigatorio && <span className="text-destructive">*</span>}
                </Label>
                {col.options ? (
                  <Select value={form[col.key] ?? ""} onValueChange={(v) => set(col.key, v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {col.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={inputType}
                    value={form[col.key] ?? ""}
                    onChange={(e) => set(col.key, e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={saving}>Cancelar</Button>
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
