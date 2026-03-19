import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Factory, LogIn } from "lucide-react";
import { toast } from "sonner";

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    if (email === "admin1" && password === "admin1") {
      onLogin();
    } else {
      toast.error("Email ou senha incorretos.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Factory className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Produção</h1>
          <p className="text-muted-foreground text-sm mt-1">Fábrica de Portas — Registro de Produção</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
          <div>
            <label className="field-label">Email</label>
            <Input
              type="email"
              placeholder="operador@fabrica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div>
            <label className="field-label">Senha</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full h-12 text-base font-semibold gap-2">
            <LogIn className="h-5 w-5" />
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema de Registro Industrial v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
