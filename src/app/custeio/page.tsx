"use client";

import { RequirePagina } from "@/components/RequirePagina";
import { CusteioDashboard } from "@/components/custeio/CusteioDashboard";

export default function CusteioPage() {
  return (
    <RequirePagina pagina="custeio:dashboard">
      <CusteioDashboard />
    </RequirePagina>
  );
}
