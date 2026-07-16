// Tipos puros (sem runtime server-only) compartilhados entre src/lib/rbac.ts
// (server) e os componentes client-side de src/components/admin/ — evita
// puxar "next/server"/getSession pro bundle do cliente.

export interface PermissaoRow {
  id: number;
  modulo: string;
  acao: string;
  label: string;
  descricao: string | null;
}
