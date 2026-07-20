// Consultas recentes de Rastreabilidade — persistidas em localStorage (sem
// tabela nova no banco, mesmo espírito leve já usado por spa-bridge.ts/tema).

import type { TraceabilityFilters } from "./aqSearch";

export interface RecentSearch {
  id: string;
  label: string;
  sublabel?: string;
  timestamp: number;
  filters: TraceabilityFilters;
}

const STORAGE_KEY = "logp_rastreabilidade_recentes_v1";
const MAX_ITEMS = 8;

export function lerConsultasRecentes(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export function salvarConsultaRecente(entry: Omit<RecentSearch, "id" | "timestamp">): RecentSearch[] {
  const atuais = lerConsultasRecentes();
  const novo: RecentSearch = { ...entry, id: `${Date.now()}`, timestamp: Date.now() };
  const proximos = [novo, ...atuais].slice(0, MAX_ITEMS);
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(proximos));
  return proximos;
}

export function removerConsultaRecente(id: string): RecentSearch[] {
  const proximos = lerConsultasRecentes().filter(e => e.id !== id);
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(proximos));
  return proximos;
}

export function limparConsultasRecentes(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}
