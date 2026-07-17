"use client";

import { useState, type ReactNode } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/production/EmptyState";
import { Inbox } from "lucide-react";

export interface SettingsTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface SettingsTableProps<T> {
  columns: SettingsTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  searchPlaceholder?: string;
  searchFn?: (row: T, term: string) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarExtra?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSizeOptions?: number[];
}

// Tabela genérica reutilizável nas páginas de Configurações: busca + paginação
// no mesmo padrão já usado em MaquinasPage.tsx/UsuariosPage.tsx, sem repetir a
// lógica de paginação em cada página nova.
export function SettingsTable<T>({
  columns, rows, getRowId, searchPlaceholder = "Buscar...", searchFn, emptyTitle = "Nada encontrado",
  emptyDescription = "Ajuste a busca ou os filtros.", toolbarExtra, onRowClick, pageSizeOptions = [10, 25, 50, 100],
}: SettingsTableProps<T>) {
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const filtradas = busca && searchFn ? rows.filter((r) => searchFn(r, busca.trim().toLowerCase())) : rows;
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const paginaAtual = Math.min(page, totalPaginas);
  const pagina = filtradas.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {searchFn ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              className="pl-8 h-8 w-56 text-sm"
            />
          </div>
        ) : <div />}
        {toolbarExtra}
      </div>

      {pagina.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.hideOnMobile ? `hidden md:table-cell ${col.className ?? ""}` : col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagina.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.hideOnMobile ? `hidden md:table-cell ${col.className ?? ""}` : col.className}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtradas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Mostrar</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>de {filtradas.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={paginaAtual <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-1.5">Página {paginaAtual} de {totalPaginas}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={paginaAtual >= totalPaginas} onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
