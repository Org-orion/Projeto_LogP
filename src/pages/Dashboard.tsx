import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConnectionBadge from "@/components/ConnectionBadge";
import ProductionForm from "@/components/ProductionForm";
import { Factory, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const MACHINES = [
  { id: "AQ017", name: "AQ017 - Prensa Fria" },
  { id: "AQ009", name: "AQ009 - Seccionadora" },
  { id: "AQ012", name: "AQ012 - Coladeira" },
  { id: "AQ005", name: "AQ005 - Esquadrejadeira" },
  { id: "AQ021", name: "AQ021 - Tupia" },
];

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState(MACHINES[0].id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Controle de Produção</h1>
            <p className="text-xs text-muted-foreground">Registro de Produção — Portas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge />
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-1">
            {MACHINES.map((machine) => (
              <TabsTrigger
                key={machine.id}
                value={machine.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none rounded-lg px-4 py-2 text-sm font-medium"
              >
                {machine.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {MACHINES.map((machine) => (
            <TabsContent key={machine.id} value={machine.id} className="mt-0 max-w-5xl mx-auto">
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h2 className="text-lg font-bold text-foreground">{machine.name}</h2>
                </div>
                <ProductionForm machineName={machine.name} />
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default Dashboard;
