import { BarChart3, ClipboardList, Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PlaceholderPage = ({ title, description, icon }: PlaceholderPageProps) => (
  <div className="max-w-5xl mx-auto">
    <div className="bg-card rounded-xl border border-border p-12 shadow-sm flex flex-col items-center justify-center text-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <Construction className="h-4 w-4" />
        Em desenvolvimento
      </div>
    </div>
  </div>
);

export const RelatoriosPage = () => (
  <PlaceholderPage
    title="Relatórios"
    description="Visualize relatórios de produção, eficiência por máquina e indicadores de qualidade."
    icon={<BarChart3 className="h-8 w-8 text-primary" />}
  />
);

export const RegistrosPage = () => (
  <PlaceholderPage
    title="Registros"
    description="Consulte o histórico completo de registros de produção por data, máquina e operador."
    icon={<ClipboardList className="h-8 w-8 text-primary" />}
  />
);

export const AjudaPage = () => (
  <PlaceholderPage
    title="Ajuda"
    description="Documentação de uso, tutoriais e suporte técnico para o sistema de produção."
    icon={<Construction className="h-8 w-8 text-primary" />}
  />
);
