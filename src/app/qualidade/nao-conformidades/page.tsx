import NaoConformidadesTab from "@/components/NaoConformidadesTab";
import { RequirePerfil } from "@/components/configuracoes/RequirePerfil";
import { RequirePagina } from "@/components/RequirePagina";

// NaoConformidadesTab já é standalone (não depende de navigation-context/rota
// da SPA) — reaproveitado sem nenhuma alteração, ver plano em
// C:\Users\PC101\.claude\plans\snuggly-sleeping-pelican.md
export default function NaoConformidadesPage() {
  return (
    <RequirePagina pagina="qualidade:nao-conformidades">
      <RequirePerfil perfis={["Administrador", "Supervisor"]}>
        <NaoConformidadesTab />
      </RequirePerfil>
    </RequirePagina>
  );
}
