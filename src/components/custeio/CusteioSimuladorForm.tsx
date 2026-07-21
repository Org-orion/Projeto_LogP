"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpinnerCustom } from "@/components/ui/spinner";
import { useOpcoesCusteio } from "@/hooks/useOpcoesCusteio";
import type { ConfiguracaoCusteio } from "@/lib/custeio-motor/types";

const NENHUMA = "__nenhuma__";

export const CONFIG_PADRAO: ConfiguracaoCusteio = {
  modelo: "SOFISTICATO",
  larguraPorta: 70,
  alturaPorta: 2.1,
  enchimento: "Sólido",
  recobrimento: "BRANCO",
  pintura: "UV BRANCO",
  larguraBatente: 12,
  espessuraAlizar: 9,
  perfilAlizar: "5x5",
  fechadura: null,
  dobradica: "D COMUM",
  tipoTrava: "MDF",
  pallet: "Sim",
  montagem: "Não",
  usinagem: "Não",
  frizo: "Não",
};

interface Props {
  onChange: (config: ConfiguracaoCusteio) => void;
}

export function CusteioSimuladorForm({ onChange }: Props) {
  const { opcoes, loading } = useOpcoesCusteio();
  const [config, setConfig] = useState<ConfiguracaoCusteio>(CONFIG_PADRAO);

  useEffect(() => { onChange(config); }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  function atualizar<K extends keyof ConfiguracaoCusteio>(campo: K, valor: ConfiguracaoCusteio[K]) {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }

  const perfisDisponiveis = opcoes.perfisAlizarPorEspessura[config.espessuraAlizar] ?? [];

  if (loading) {
    return <div className="flex items-center justify-center py-12"><SpinnerCustom /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração</CardTitle>
        <CardDescription>Monte a especificação do produto — o custo recalcula automaticamente.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={config.modelo} onValueChange={(v) => atualizar("modelo", v as ConfiguracaoCusteio["modelo"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ESSENZIALE">ESSENZIALE</SelectItem>
                <SelectItem value="INNOVAZIONE">INNOVAZIONE</SelectItem>
                <SelectItem value="SOFISTICATO">SOFISTICATO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Largura da porta (cm)</Label>
            <Input
              type="number" value={config.larguraPorta}
              onChange={(e) => atualizar("larguraPorta", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Altura da porta (m)</Label>
            <Input
              type="number" step="0.01" value={config.alturaPorta}
              onChange={(e) => atualizar("alturaPorta", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Enchimento</Label>
            <Select value={config.enchimento} onValueChange={(v) => atualizar("enchimento", v as ConfiguracaoCusteio["enchimento"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Colméia">Colméia</SelectItem>
                <SelectItem value="3">3 (comum)</SelectItem>
                <SelectItem value="6">6 (comum)</SelectItem>
                <SelectItem value="Sólido">Sólido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recobrimento</Label>
            <Select value={config.recobrimento ?? ""} onValueChange={(v) => atualizar("recobrimento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {opcoes.recobrimentos.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Pintura</Label>
            <Select
              value={config.pintura ?? NENHUMA}
              onValueChange={(v) => atualizar("pintura", v === NENHUMA ? null : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUMA}>Nenhuma (recoberta)</SelectItem>
                {opcoes.pinturas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Largura do batente (cm)</Label>
            <Select
              value={String(config.larguraBatente)}
              onValueChange={(v) => atualizar("larguraBatente", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {opcoes.largurasBatente.map((l) => <SelectItem key={l} value={String(l)}>{l} cm</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Espessura do alizar</Label>
            <Select
              value={String(config.espessuraAlizar)}
              onValueChange={(v) => {
                const esp = Number(v) as 9 | 15;
                const perfis = opcoes.perfisAlizarPorEspessura[esp] ?? [];
                setConfig((prev) => ({
                  ...prev, espessuraAlizar: esp,
                  perfilAlizar: perfis.includes(prev.perfilAlizar) ? prev.perfilAlizar : (perfis[0] ?? ""),
                }));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9 mm</SelectItem>
                <SelectItem value="15">15 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Perfil do alizar</Label>
            <Select value={config.perfilAlizar} onValueChange={(v) => atualizar("perfilAlizar", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {perfisDisponiveis.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fechadura</Label>
            <Select
              value={config.fechadura ?? NENHUMA}
              onValueChange={(v) => atualizar("fechadura", v === NENHUMA ? null : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUMA}>Nenhuma</SelectItem>
                {opcoes.fechaduras.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Dobradiça</Label>
            <Select
              value={config.dobradica ?? NENHUMA}
              onValueChange={(v) => atualizar("dobradica", v === NENHUMA ? null : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUMA}>Nenhuma</SelectItem>
                {opcoes.dobradicas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de trava (kit)</Label>
            <Select value={config.tipoTrava} onValueChange={(v) => atualizar("tipoTrava", v as ConfiguracaoCusteio["tipoTrava"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MDF">MDF</SelectItem>
                <SelectItem value="Eucalipto">Eucalipto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-6 border-t pt-4">
          {([
            ["pallet", "Pallet"], ["montagem", "Montagem"], ["usinagem", "Usinagem"], ["frizo", "Frizo"],
          ] as const).map(([campo, label]) => (
            <div key={campo} className="flex items-center gap-2">
              <Switch
                checked={config[campo] === "Sim"}
                onCheckedChange={(marcado) => atualizar(campo, marcado ? "Sim" : "Não")}
              />
              <Label>{label}</Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
