"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Factory,
  Home,
  ShieldCheck,
  BadgeCheck,
  Settings,
  UserCog,
  Calculator,
  LogOut,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useNavigation } from "@/context/navigation-context"
import {
  PRODUCAO_SUBS, CERTIFICACOES_SUBS, CONFIGURACOES_SUBS, QUALIDADE_ROUTE_SUBS, ADMIN_ROUTE_SUBS,
  RASTREABILIDADE_ROUTE_SUBS, CUSTEIO_ROUTE_SUBS, PRODUCAO_LABELS, CERTIFICACOES_LABELS, hasPageAccess, hasAnyGroupAccess,
} from "@/lib/nav-items"
import { goToSpaSection } from "@/lib/spa-bridge"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { nome: string; email: string; perfil?: string; paginas?: string[] }
  allowedSections: string[]
  onLogout: () => void
}

export function AppSidebar({ user, allowedSections, onLogout, ...props }: AppSidebarProps) {
  const { active, setSection } = useNavigation()
  const pathname = usePathname()
  const router = useRouter()

  // "Configurações" tem rota real do Next.js (/configuracoes/*) — o resto do
  // app continua sendo a SPA de sempre (section/subSection em navigation-context).
  // Fora da raiz "/", active.section não representa mais a página atual, então
  // nenhum item da SPA fica "ativo"; navegar de volta pra ela passa por
  // goToSpaSection (grava a seção no localStorage e faz um push real pra "/").
  const inSpaRoot = pathname === "/"
  function goSection(id: string, subId?: string) {
    if (inSpaRoot) setSection(id, subId)
    else goToSpaSection(router, id, subId)
  }

  const showProducao = PRODUCAO_SUBS.some((id) => allowedSections.includes(id))
  const showCertificacoes = CERTIFICACOES_SUBS.some((id) => allowedSections.includes(id))

  const NAV_ITEMS = [
    allowedSections.includes("home") && {
      title: "Home",
      url: "#",
      icon: Home,
      items: [],
      isActive: inSpaRoot && active.section === "home",
      onTopClick: () => goSection("home"),
    },
    showProducao && {
      title: "Produção",
      url: "#",
      icon: Factory,
      isActive: inSpaRoot && PRODUCAO_SUBS.includes(active.section),
      items: PRODUCAO_SUBS.filter((id) => allowedSections.includes(id)).map((id) => ({
        title: PRODUCAO_LABELS[id],
        url: "#",
        onClick: () => goSection(id),
        isActive: inSpaRoot && active.section === id,
      })),
    },
    hasAnyGroupAccess(user, "rastreabilidade") && {
      title: "Rastreabilidade",
      url: "#",
      icon: Factory,
      isActive: pathname?.startsWith("/rastreabilidade") ?? false,
      items: RASTREABILIDADE_ROUTE_SUBS.filter((s) => hasPageAccess(user, `rastreabilidade:${s.id}`)).map((s) => ({
        title: s.label,
        url: "#",
        href: s.href,
        isActive: pathname === s.href,
      })),
    },
    hasAnyGroupAccess(user, "custeio") && {
      title: "Custeio de Produto",
      url: "#",
      icon: Calculator,
      isActive: pathname?.startsWith("/custeio") ?? false,
      items: CUSTEIO_ROUTE_SUBS.filter((s) => hasPageAccess(user, `custeio:${s.id}`)).map((s) => ({
        title: s.label,
        url: "#",
        href: s.href,
        isActive: pathname === s.href,
      })),
    },
    hasAnyGroupAccess(user, "qualidade") && {
      title: "Controle de Qualidade",
      url: "#",
      icon: ShieldCheck,
      isActive: pathname?.startsWith("/qualidade") ?? false,
      items: QUALIDADE_ROUTE_SUBS.filter((s) => hasPageAccess(user, `qualidade:${s.id}`)).map((s) => ({
        title: s.label,
        url: "#",
        href: s.href,
        isActive: pathname === s.href,
      })),
    },
    showCertificacoes && {
      title: "Certificações",
      url: "#",
      icon: BadgeCheck,
      isActive: inSpaRoot && CERTIFICACOES_SUBS.includes(active.section),
      items: CERTIFICACOES_SUBS.filter((id) => allowedSections.includes(id)).map((id) => ({
        title: CERTIFICACOES_LABELS[id],
        url: "#",
        onClick: () => goSection(id),
        isActive: inSpaRoot && active.section === id,
      })),
    },
    hasAnyGroupAccess(user, "usuarios") && {
      title: "Administração",
      url: "#",
      icon: UserCog,
      isActive: pathname?.startsWith("/admin") ?? false,
      items: ADMIN_ROUTE_SUBS.filter((s) => hasPageAccess(user, `usuarios:${s.id}`)).map((s) => ({
        title: s.label,
        url: "#",
        href: s.href,
        isActive: pathname === s.href,
      })),
    },
    hasAnyGroupAccess(user, "configuracoes") && {
      title: "Configurações",
      url: "#",
      icon: Settings,
      isActive: pathname?.startsWith("/configuracoes") ?? false,
      items: CONFIGURACOES_SUBS.filter((s) => hasPageAccess(user, `configuracoes:${s.id}`)).map((s) => ({
        title: s.label,
        url: "#",
        href: s.href,
        isActive: pathname === s.href,
      })),
    },
  ].filter(Boolean) as Parameters<typeof NavMain>[0]["items"]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="py-3">
        <a
          href="#"
          onClick={() => goSection("home")}
          className="-m-1 flex items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-emerald-500/10"
        >
          <img src="/isotipo-branco.png" alt="Concrem" className="h-8 w-8 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-white">CONCREM</span>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-emerald-500/15 text-emerald-300">
                PROD
              </span>
            </div>
            <span className="truncate text-xs text-emerald-100/50">Sistema de Produção</span>
          </div>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate text-xs text-emerald-100/70 group-data-[collapsible=icon]:hidden">
            Operação estável
          </span>
        </div>
        <NavUser user={user} onLogout={onLogout} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={onLogout}
              className="text-red-300/80 hover:bg-red-500/10 hover:text-red-200"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
