"use client";

import { useState } from "react";
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QualityPageHeader } from "@/components/qualidade/QualityPageHeader";
import { QualityKpiCard } from "@/components/qualidade/QualityKpiCard";
import { MockDataBanner } from "@/components/configuracoes/MockDataBanner";
import { ConfirmDialog } from "@/components/configuracoes/ConfirmDialog";
import { ActionPlanTable, type PlanoAcao } from "@/components/qualidade/ActionPlanTable";
import { ActionPlanForm, type PlanoAcaoFormValues } from "@/components/qualidade/ActionPlanForm";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

// Página 100% mock (sem tabela real hoje) — interface completa, estado local
// por sessão do navegador. SQL das tabelas `planos_acao`/`planos_acao_itens`
// entregue no resumo final.
const PLANOS_INICIAIS: PlanoAcao[] = [
  {
    id: "pa-1", numero: "PA-0001", titulo: "Reduzir gramatura fora da faixa na Moldureira 1/2",
    origem: "Inspeção INSP-0002", metodologia: "5-porques", responsavel: "Ana Costa", progresso: 40,
    prazo: "2026-08-15", status: "em_andamento",
    itens: [
      { id: "a1", descricao: "Calibrar rolo aplicador", responsavel: "Manutenção", prazo: "2026-07-25", status: "concluido" },
      { id: "a2", descricao: "Revisar padrão de gramatura no setup", responsavel: "Ana Costa", prazo: "2026-08-05", status: "em_andamento" },
    ],
    criterioEficacia: "0 reincidências de gramatura fora da faixa em 30 dias.",
    eficacia: "nao_avaliada", dataVerificacaoEficacia: "", avaliador: "",
  },
];

const FORM_VAZIO: PlanoAcaoFormValues = {
  titulo: "", origem: "", metodologia: "5w2h", responsavel: "", progresso: 0, prazo: new Date().toISOString().slice(0, 10),
  status: "planejado", itens: [], criterioEficacia: "", eficacia: "nao_avaliada", dataVerificacaoEficacia: "", avaliador: "",
};

function PlanosAcaoPageInner() {
  const [planos, setPlanos] = useState<PlanoAcao[]>(PLANOS_INICIAIS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoAcao | null>(null);
  const [formValues, setFormValues] = useState<PlanoAcaoFormValues>(FORM_VAZIO);
  const [deleteTarget, setDeleteTarget] = useState<PlanoAcao | null>(null);

  const total = planos.length;
  const concluidos = planos.filter((p) => p.status === "concluido").length;
  const atrasados = planos.filter((p) => p.status === "atrasado").length;
  const eficazes = planos.filter((p) => p.eficacia === "eficaz").length;

  function openNew() {
    setEditing(null);
    setFormValues(FORM_VAZIO);
    setDialogOpen(true);
  }

  function openEdit(row: PlanoAcao) {
    setEditing(row);
    setFormValues(row);
    setDialogOpen(true);
  }

  function handleSave(values: PlanoAcaoFormValues) {
    if (!values.titulo.trim()) { toast.error("Informe o título do plano."); return; }
    if (editing) {
      setPlanos((prev) => prev.map((p) => (p.id === editing.id ? { ...editing, ...values } : p)));
      toast.success("Plano de ação atualizado.");
    } else {
      const numero = `PA-${String(planos.length + 1).padStart(4, "0")}`;
      setPlanos((prev) => [{ id: `pa-${prev.length + 1}-${Date.now() % 100000}`, numero, ...values }, ...prev]);
      toast.success("Plano de ação criado.");
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setPlanos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast.success("Plano de ação removido.");
    setDeleteTarget(null);
  }

  return (
    <RequirePerfil perfis={["Administrador", "Supervisor"]}>
    <div className="space-y-4">
      <QualityPageHeader
        title="Planos de Ação"
        description="5W2H, 5 Porquês, Ishikawa, 8D, CAPA e ações simples, com validação de eficácia."
        actions={<Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Novo Plano</Button>}
      />

      <MockDataBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QualityKpiCard icon={ClipboardCheck} label="Total de Planos" value={total} tone="neutral" />
        <QualityKpiCard icon={CheckCircle2} label="Concluídos" value={concluidos} tone="primary" />
        <QualityKpiCard icon={AlertTriangle} label="Atrasados" value={atrasados} tone="destructive" />
        <QualityKpiCard icon={CheckCircle2} label="Validados como Eficazes" value={eficazes} tone="primary" />
      </div>

      <ActionPlanTable rows={planos} onView={openEdit} onEdit={openEdit} onDelete={setDeleteTarget} />

      <ActionPlanForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={formValues}
        editing={!!editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir plano de ação?"
        description={deleteTarget ? `O plano ${deleteTarget.numero} será removido desta sessão.` : ""}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
    </RequirePerfil>
  );
}

export default function PlanosAcaoPage() {
  return (
    <RequirePagina pagina="qualidade:planos-acao">
      <PlanosAcaoPageInner />
    </RequirePagina>
  );
}
