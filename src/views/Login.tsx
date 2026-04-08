import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil?: string;
  paginas?: string[];
}

interface LoginProps {
  onLogin: (user: UsuarioLogado) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, senha, perfil, paginas")
        .eq("email", email)
        .single();

      if (error || !data || data.senha !== password) {
        toast.error("Email ou senha incorretos.");
      } else {
        onLogin({ id: data.id, nome: data.nome, email: data.email, perfil: data.perfil, paginas: data.paginas });
      }
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#055226" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo-concrem.png" alt="Concrem Portas Premium" className="h-24 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white">Controle de Produção</h1>
          <p className="text-white/70 text-sm mt-1">Fábrica de Portas — Registro de Produção</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
          <div>
            <label className="field-label text-white">Email</label>
            <Input
              type="email"
              placeholder="operador@fabrica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div>
            <label className="field-label text-white">Senha</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold gap-2">
            <LogIn className="h-5 w-5" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-xs text-white/60 mt-6">
          Sistema de Registro Industrial v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
