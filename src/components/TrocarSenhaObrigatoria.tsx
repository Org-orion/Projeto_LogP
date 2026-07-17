"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TrocarSenhaObrigatoriaProps {
  onTrocada: () => void;
}

// Tela forçada quando usuarios.deve_trocar_senha = true — usada logo após a
// migração pra Supabase Auth (senha temporária) ou depois que um admin força
// logout em todos os dispositivos de alguém.
export function TrocarSenhaObrigatoria({ onTrocada }: TrocarSenhaObrigatoriaProps) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const res = await fetch("/api/auth/trocar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novaSenha }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao trocar senha.");
      setSalvando(false);
      return;
    }
    toast.success("Senha definida. Faça login novamente com a nova senha.");
    onTrocada();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Defina sua nova senha</CardTitle>
          <p className="text-sm text-muted-foreground">Por segurança, você precisa criar uma senha nova antes de continuar.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder="Repita a senha" autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Definir senha e continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
