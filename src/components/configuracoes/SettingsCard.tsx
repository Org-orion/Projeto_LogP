"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ title, description, icon, actions, children, className }: SettingsCardProps) {
  return (
    <div className={cn("bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              {title && <p className="text-sm font-semibold">{title}</p>}
              {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
