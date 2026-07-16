"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { PermissionTree } from "@/components/admin/PermissionTree";
import type { PermissaoRow } from "@/types/rbac";

export interface RoleFormValues {
  nome: string;
  descricao: string;
  status: "ativo" | "inativo";
}

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: RoleFormValues;
  onChange: (values: RoleFormValues) => void;
  catalogo: PermissaoRow[];
  selecionadas: Set<number>;
  onChangeSelecionadas: (next: Set<number>) => void;
  editing: boolean;
  isAdministrador: boolean;
  saving?: boolean;
  onSave: () => void;
}

export function RoleForm({
  open, onOpenChange, values, onChange, catalogo, selecionadas, onChangeSelecionadas, editing, isAdministrador, saving, onSave,
}: RoleFormProps) {
  function set<K extends keyof RoleFormValues>(field: K, value: RoleFormValues[K]) {
    onChange({ ...values, [field]: value });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? `Editar Perfil — ${values.nome}` : "Novo Perfil de Acesso"}</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={values.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Auditor" disabled={isAdministrador} />
            {isAdministrador && <p className="text-xs text-muted-foreground">O perfil Administrador não pode ser renomeado.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={values.descricao} onChange={(e) => set("descricao", e.target.value)} className="resize-none" placeholder="Para que serve este perfil..." />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(v: RoleFormValues["status"]) => set("status", v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label>Permissões do perfil</Label>
            <PermissionTree catalogo={catalogo} selecionadas={selecionadas} onChange={onChangeSelecionadas} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Salvar Alterações" : "Criar Perfil"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
