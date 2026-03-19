import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DefectBlock {
  tipo: string;
  quantidade: string;
}

const FORNECEDORES = ["Eucatex", "Duratex", "Arauco", "Masisa", "Berneck"];
const PRODUTOS = ["Porta Lisa", "Porta Frisada", "Porta Decorada", "Porta Pivotante", "Porta Sólida"];
const DEFEITOS = ["Empenamento", "Delaminação", "Bolha", "Risco", "Trinca", "Mancha", "Dimensional", "Outro"];

const ProductionForm = ({ machineName }: { machineName: string }) => {
  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    horaInicial: "",
    horaFinal: "",
    fornecedor: "",
    produto: "",
    pressao: "",
    largura: "",
    altura: "",
    espessura: "",
    gramatura: "",
    qtdConforme: "",
  });

  const [defeitos, setDefeitos] = useState<DefectBlock[]>([{ tipo: "", quantidade: "" }]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateDefect = (index: number, key: keyof DefectBlock, value: string) => {
    setDefeitos((prev) => prev.map((d, i) => (i === index ? { ...d, [key]: value } : d)));
  };

  const addDefect = () => {
    if (defeitos.length < 4) setDefeitos((prev) => [...prev, { tipo: "", quantidade: "" }]);
  };

  const removeDefect = (index: number) => {
    if (defeitos.length > 1) setDefeitos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!form.data || !form.horaInicial || !form.fornecedor || !form.produto) {
      toast.error("Preencha os campos obrigatórios: Data, Hora Inicial, Fornecedor e Produto.");
      return;
    }
    const record = { ...form, defeitos, maquina: machineName, timestamp: new Date().toISOString() };
    console.log("Registro salvo:", record);
    toast.success("Registro de produção salvo com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Linha 1: Data e Horários */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="field-label">Data *</label>
          <Input type="date" value={form.data} onChange={(e) => updateField("data", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Hora Inicial *</label>
          <Input type="time" value={form.horaInicial} onChange={(e) => updateField("horaInicial", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Hora Final</label>
          <Input type="time" value={form.horaFinal} onChange={(e) => updateField("horaFinal", e.target.value)} />
        </div>
      </div>

      {/* Linha 2: Fornecedor e Produto */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Fornecedor *</label>
          <Select value={form.fornecedor} onValueChange={(v) => updateField("fornecedor", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {FORNECEDORES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="field-label">Produto *</label>
          <Select value={form.produto} onValueChange={(v) => updateField("produto", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {PRODUTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 3: Parâmetros de Produção */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <div className="h-1 w-4 rounded-full bg-primary" />
          Parâmetros de Produção
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="field-label">Pressão (bar)</label>
            <Input type="number" placeholder="0" value={form.pressao} onChange={(e) => updateField("pressao", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Largura (mm)</label>
            <Input type="number" placeholder="0" value={form.largura} onChange={(e) => updateField("largura", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Altura (mm)</label>
            <Input type="number" placeholder="0" value={form.altura} onChange={(e) => updateField("altura", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Espessura (mm)</label>
            <Input type="number" placeholder="0" value={form.espessura} onChange={(e) => updateField("espessura", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Gramatura (g/m²)</label>
            <Input type="number" placeholder="0" value={form.gramatura} onChange={(e) => updateField("gramatura", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Linha 4: Quantidade Conforme */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-1">
          <label className="field-label">Qtd. Conforme</label>
          <Input
            type="number"
            placeholder="0"
            value={form.qtdConforme}
            onChange={(e) => updateField("qtdConforme", e.target.value)}
            className="border-primary/30 bg-primary/5 font-semibold text-lg"
          />
        </div>
      </div>

      {/* Defeitos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-destructive" />
            Defeitos
          </h3>
          {defeitos.length < 4 && (
            <Button variant="outline" size="sm" onClick={addDefect} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar Defeito
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {defeitos.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-3 items-end">
              <div>
                <label className="field-label">Tipo de Defeito</label>
                <Select value={d.tipo} onValueChange={(v) => updateDefect(i, "tipo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o defeito" /></SelectTrigger>
                  <SelectContent>
                    {DEFEITOS.map((def) => <SelectItem key={def} value={def}>{def}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Qtd.</label>
                <Input type="number" placeholder="0" value={d.quantidade} onChange={(e) => updateDefect(i, "quantidade", e.target.value)} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDefect(i)}
                disabled={defeitos.length <= 1}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="pt-4 border-t border-border">
        <Button onClick={handleSave} size="lg" className="w-full text-base font-semibold gap-2 h-14">
          <Save className="h-5 w-5" />
          Salvar Registro de Produção
        </Button>
      </div>
    </div>
  );
};

export default ProductionForm;
