"use client"

import { lazy, Suspense } from "react"
import { SpinnerCustom } from "@/components/ui/spinner"
import { useWorkspace } from "@/context/workspace-context"

const HomePage                = lazy(() => import("@/components/HomePage"))
const MaquinasPage            = lazy(() => import("@/components/MaquinasPage"))
const UsoeConsumoPage         = lazy(() => import("@/components/UsoeConsumoPage"))
const PedidosPage             = lazy(() => import("@/components/PedidosPage"))
const MetasPage               = lazy(() => import("@/components/MetasPage"))
const LeituraProducaoPage     = lazy(() => import("@/components/LeituraProducaoPage"))
const QualidadePage           = lazy(() => import("@/components/QualidadePage"))
const MaterialCertificadoPage = lazy(() => import("@/components/MaterialCertificadoPage"))
const AuditoriasPage          = lazy(() => import("@/components/AuditoriasPage"))
const UsuariosPage            = lazy(() => import("@/components/UsuariosPage"))
const ConfiguracoesPage       = lazy(() => import("@/components/ConfiguracoesPage"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <SpinnerCustom />
    </div>
  )
}

interface DashboardContentProps {
  user: { id: number; nome: string; email: string; perfil?: string }
  isAdmin: boolean
}

export function DashboardContent({ user, isAdmin }: DashboardContentProps) {
  const { tabs, activeId, refreshKeys } = useWorkspace()

  function renderSection(section: string, subSection?: string) {
    switch (section) {
      case "home":           return <HomePage userName={user.nome} />
      case "machines":       return <MaquinasPage user={user} />
      case "consumo":        return <UsoeConsumoPage />
      case "pedidos":        return <PedidosPage />
      case "metas":          return <MetasPage />
      case "leituras":       return <LeituraProducaoPage />
      case "qualidade":      return <QualidadePage subSection={subSection ?? "gramatura"} />
      case "material-fsc":   return <MaterialCertificadoPage />
      case "auditorias":     return <AuditoriasPage isAdmin={isAdmin} />
      case "usuarios":       return <UsuariosPage isAdmin={isAdmin} />
      case "configuracoes":  return <ConfiguracoesPage />
      default:               return <HomePage userName={user.nome} />
    }
  }

  // Mantém todas as abas SPA já abertas montadas ao mesmo tempo, alternando
  // visibilidade via CSS — isso preserva scroll/filtros/formulários/seleções
  // de cada uma sem precisar tocar em nenhuma página individualmente (ver
  // plano do Workspace de abas). A troca de aba nunca desmonta a anterior.
  const spaTabs = tabs.filter((t) => t.kind === "spa")

  return (
    <Suspense fallback={<PageLoader />}>
      {spaTabs.map((tab) => {
        const isActive = tab.id === activeId
        const refreshKey = refreshKeys[tab.id] ?? 0
        return (
          <div key={tab.id} className={isActive ? undefined : "hidden"}>
            <div key={refreshKey}>
              {tab.section === "home" ? renderSection(tab.section, tab.subSection) : (
                <div className="p-6">{renderSection(tab.section ?? "home", tab.subSection)}</div>
              )}
            </div>
          </div>
        )
      })}
    </Suspense>
  )
}
