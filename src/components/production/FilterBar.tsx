"use client";

export function FilterBar({ children, chips }: { children: React.ReactNode; chips?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {chips && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t text-xs">
          {chips}
        </div>
      )}
    </div>
  );
}
