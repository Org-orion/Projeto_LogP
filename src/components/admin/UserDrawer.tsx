"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { UserForm, type UserFormValues } from "@/components/admin/UserForm";

interface PerfilOption { id: number; nome: string }

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: UserFormValues;
  onChange: (values: UserFormValues) => void;
  perfis: PerfilOption[];
  editing: boolean;
  usuarioId: string | null;
  ultimoLogin?: string | null;
  ultimoIp?: string | null;
  saving?: boolean;
  onSave: () => void;
  onForcarLogout?: () => void;
}

// Substitui o modal antigo por um Drawer lateral (Sheet), com o cadastro
// organizado em abas via UserForm.
export function UserDrawer({
  open, onOpenChange, values, onChange, perfis, editing, usuarioId, ultimoLogin, ultimoIp, saving, onSave, onForcarLogout,
}: UserDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? `Editar Usuário — ${values.nome || ""}` : "Novo Usuário"}</SheetTitle>
        </SheetHeader>

        <div className="py-4">
          <UserForm
            values={values}
            onChange={onChange}
            perfis={perfis}
            editing={editing}
            usuarioId={usuarioId}
            ultimoLogin={ultimoLogin}
            ultimoIp={ultimoIp}
            onForcarLogout={onForcarLogout}
          />
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Salvar Alterações" : "Cadastrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
