"use client";

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}
