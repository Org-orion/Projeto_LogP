"use client";

import { Clock, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RecentSearch } from "./recentSearches";

interface RecentSearchesCardProps {
  items: RecentSearch[];
  onSelect: (entry: RecentSearch) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function RecentSearchesCard({ items, onSelect, onRemove, onClear }: RecentSearchesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Consultas recentes
          </CardTitle>
          {items.length > 0 && (
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Limpar histórico" onClick={onClear}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma consulta recente.</p>
        ) : (
          items.map(entry => (
            <div key={entry.id} className="group flex items-center gap-1 rounded-md hover:bg-muted/40">
              <button onClick={() => onSelect(entry)} className="flex-1 text-left px-2.5 py-2 min-w-0">
                <p className="text-xs font-medium font-mono truncate">{entry.label}</p>
                {entry.sublabel && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {entry.sublabel} • {new Date(entry.timestamp).toLocaleString("pt-BR")}
                  </p>
                )}
              </button>
              <Button
                size="icon" variant="ghost"
                className="h-6 w-6 mr-1 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => onRemove(entry.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
