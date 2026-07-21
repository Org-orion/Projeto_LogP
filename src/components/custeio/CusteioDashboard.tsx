"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CusteioSimuladorView } from "./CusteioSimuladorView";
import { CusteioCatalogoInsumos } from "./CusteioCatalogoInsumos";
import { CusteioComoEhCalculado } from "./CusteioComoEhCalculado";

export function CusteioDashboard() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Custeio de Produto</h1>
        <p className="text-sm text-muted-foreground">
          Simule o custo de uma configuração, gerencie o catálogo de insumos ou entenda como cada valor é calculado.
        </p>
      </div>

      <Tabs defaultValue="simulador">
        <TabsList>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo de Insumos</TabsTrigger>
          <TabsTrigger value="calculo">Como é Calculado</TabsTrigger>
        </TabsList>

        <TabsContent value="simulador" className="mt-4">
          <CusteioSimuladorView />
        </TabsContent>

        <TabsContent value="catalogo" className="mt-4">
          <CusteioCatalogoInsumos />
        </TabsContent>

        <TabsContent value="calculo" className="mt-4">
          <CusteioComoEhCalculado />
        </TabsContent>
      </Tabs>
    </div>
  );
}
