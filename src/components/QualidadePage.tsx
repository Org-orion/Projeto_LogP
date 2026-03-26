import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, Package, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaterialEntry {
  id: string;
  date: Date;
  material: string;
  lote: string;
  quantidade: number;
  unidade: string;
  fornecedor: string;
  verificado: boolean;
  conforme: boolean | null; // null = not yet verified
}

const MOCK_MATERIALS: MaterialEntry[] = [
  { id: "1", date: new Date(2026, 2, 26), material: "MDF 15mm", lote: "L-2026-0341", quantidade: 120, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
  { id: "2", date: new Date(2026, 2, 26), material: "Cola PVA", lote: "L-2026-0342", quantidade: 50, unidade: "kg", fornecedor: "Henkel", verificado: true, conforme: false },
  { id: "3", date: new Date(2026, 2, 25), material: "Fita de Borda", lote: "L-2026-0338", quantidade: 300, unidade: "m", fornecedor: "Rehau", verificado: true, conforme: true },
  { id: "4", date: new Date(2026, 2, 25), material: "Dobradiça 35mm", lote: "L-2026-0339", quantidade: 500, unidade: "pcs", fornecedor: "Blum", verificado: false, conforme: null },
  { id: "5", date: new Date(2026, 2, 24), material: "Painel MDP 18mm", lote: "L-2026-0335", quantidade: 80, unidade: "chapas", fornecedor: "Duratex", verificado: true, conforme: true },
  { id: "6", date: new Date(2026, 2, 24), material: "Verniz PU", lote: "L-2026-0336", quantidade: 25, unidade: "L", fornecedor: "Sayerlack", verificado: true, conforme: false },
  { id: "7", date: new Date(2026, 2, 23), material: "Puxador Inox", lote: "L-2026-0330", quantidade: 200, unidade: "pcs", fornecedor: "Hafele", verificado: false, conforme: null },
  { id: "8", date: new Date(2026, 2, 20), material: "MDF 6mm", lote: "L-2026-0325", quantidade: 60, unidade: "chapas", fornecedor: "Eucatex", verificado: true, conforme: true },
];

export default function QualidadePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const naoConformes = MOCK_MATERIALS.filter((m) => m.conforme === false);
  const pendentes = MOCK_MATERIALS.filter((m) => !m.verificado);
  const totalRecebidos = MOCK_MATERIALS.length;

  // Entries for the selected date
  const entriesForDate = selectedDate
    ? MOCK_MATERIALS.filter(
        (m) => format(m.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
      )
    : [];

  // Dates that have entries (for calendar highlighting)
  const datesWithEntries = [...new Set(MOCK_MATERIALS.map((m) => format(m.date, "yyyy-MM-dd")))];

  const modifiers = {
    hasEntries: MOCK_MATERIALS.map((m) => m.date),
  };

  const modifiersStyles = {
    hasEntries: {
      fontWeight: 700 as const,
      textDecoration: "underline" as const,
      textDecorationColor: "hsl(var(--primary))" as const,
      textUnderlineOffset: "4px" as const,
    },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalRecebidos}</p>
              <p className="text-xs text-muted-foreground">Materiais Recebidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{naoConformes.length}</p>
              <p className="text-xs text-muted-foreground">Não Conformes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
              <p className="text-xs text-muted-foreground">Pendentes de Verificação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Calendário de Recebimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="pointer-events-auto"
            />
            {selectedDate && entriesForDate.length > 0 && (
              <div className="w-full mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </p>
                {entriesForDate.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.material}</p>
                      <p className="text-xs text-muted-foreground">
                        Lote: {entry.lote} · {entry.quantidade} {entry.unidade}
                      </p>
                    </div>
                    {entry.verificado ? (
                      entry.conforme ? (
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Conforme
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">
                          <XCircle className="h-3 w-3 mr-1" /> Não Conforme
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedDate && entriesForDate.length === 0 && (
              <p className="text-xs text-muted-foreground mt-4">Nenhum recebimento nesta data.</p>
            )}
          </CardContent>
        </Card>

        {/* Non-conforming materials table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Materiais Não Conformes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {naoConformes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum material não conforme registrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {naoConformes.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{m.material}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                      <TableCell>{m.quantidade} {m.unidade}</TableCell>
                      <TableCell>{m.fornecedor}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">
                          Não Conforme
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full materials table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Todos os Recebimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>Qualidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_MATERIALS.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{format(m.date, "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">{m.material}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.lote}</TableCell>
                  <TableCell>{m.quantidade} {m.unidade}</TableCell>
                  <TableCell>{m.fornecedor}</TableCell>
                  <TableCell>
                    {m.verificado ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </TableCell>
                  <TableCell>
                    {m.conforme === null ? (
                      <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    ) : m.conforme ? (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Conforme</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Não Conforme</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
