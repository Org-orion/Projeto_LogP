"use client"

import { lazy, Suspense } from "react"
import { SpinnerCustom } from "@/components/ui/spinner"
import { useNavigation } from "@/context/navigation-context"

const HomePage                = lazy(() => import("@/components/HomePage"))
const MaquinasPage            = lazy(() => import("@/components/MaquinasPage"))
const RastreabilidadePage     = lazy(() => import("@/components/RastreabilidadePage"))
const UsoeConsumoPage         = lazy(() => import("@/components/UsoeConsumoPage"))
const PedidosPage             = lazy(() => import("@/components/PedidosPage"))
const MetasPage               = lazy(() => import("@/components/MetasPage"))
const LeituraProducaoPage     = lazy(() => import("@/components/LeituraProducaoPage"))
const QualidadePage           = lazy(() => import("@/components/QualidadePage"))
const MaterialCertificadoPage = lazy(() => import("@/components/MaterialCertificadoPage"))
const AuditoriasPage          = lazy(() => import("@/components/AuditoriasPage"))
const UsuariosPage            = lazy(() => import("@/components/UsuariosPage"))
const ConfiguracoesPage       = lazy(() => import("@/components/ConfiguracoesPage"))

const mockUser = { id: 0, nome: "Admin", email: "", perfil: "Administrador" }

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <SpinnerCustom />
    </div>
  )
}

export function DashboardContent() {
  const { active } = useNavigation()
  const isAdmin = true

  function renderPage() {
    switch (active.section) {
      case "home":           return <HomePage userName={mockUser.nome} />
      case "machines":       return <MaquinasPage user={mockUser} />
      case "rastreabilidade": return <RastreabilidadePage />
      case "consumo":        return <UsoeConsumoPage />
      case "pedidos":        return <PedidosPage />
      case "metas":          return <MetasPage />
      case "leituras":       return <LeituraProducaoPage />
      case "qualidade":      return <QualidadePage subSection={active.subSection ?? "gramatura"} />
      case "material-fsc":   return <MaterialCertificadoPage />
      case "auditorias":     return <AuditoriasPage isAdmin={isAdmin} />
      case "usuarios":       return <UsuariosPage isAdmin={isAdmin} />
      case "configuracoes":  return <ConfiguracoesPage />
      default:               return <HomePage userName={mockUser.nome} />
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <div key={active.section + (active.subSection ?? "")}>
        {active.section === "home" ? renderPage() : (
          <div className="p-6">{renderPage()}</div>
        )}
      </div>
    </Suspense>
  )
}
