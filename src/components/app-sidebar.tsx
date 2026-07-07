"use client"

import * as React from "react"
import {
  Factory,
  Home,
  ShieldCheck,
  BadgeCheck,
  UserCog,
  Settings,
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

const USER = {
  name: "Usuário",
  email: "usuario@concrem.com.br",
  avatar: "",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setActive } = useNavigation()

  const nav = (parent: string | null, title: string, section: string, subSection?: string) =>
    () => setActive({ parent, title, section, subSection })

  const NAV_ITEMS = [
    {
      title: "Home",
      url: "#",
      icon: Home,
      items: [],
      onTopClick: nav(null, "Home", "home"),
    },
    {
      title: "Produção",
      url: "#",
      icon: Factory,
      isActive: false,
      items: [
        { title: "Produção",        url: "#", onClick: nav("Produção", "Produção",        "machines")        },
        { title: "Rastreabilidade", url: "#", onClick: nav("Produção", "Rastreabilidade", "rastreabilidade") },
        { title: "Uso e Consumo",   url: "#", onClick: nav("Produção", "Uso e Consumo",   "consumo")         },
        { title: "Pedidos",         url: "#", onClick: nav("Produção", "Pedidos",          "pedidos")        },
        { title: "Metas",           url: "#", onClick: nav("Produção", "Metas",            "metas")          },
        { title: "Monitoramento",   url: "#", onClick: nav("Produção", "Monitoramento",    "leituras")       },
      ],
    },
    {
      title: "Controle de Qualidade",
      url: "#",
      icon: ShieldCheck,
      items: [
        { title: "Gramatura",              url: "#", onClick: nav("Controle de Qualidade", "Gramatura",              "qualidade", "gramatura")          },
        { title: "Recebimento de Insumos", url: "#", onClick: nav("Controle de Qualidade", "Recebimento de Insumos", "qualidade", "recebimento")        },
        { title: "Não Conformidades",      url: "#", onClick: nav("Controle de Qualidade", "Não Conformidades",      "qualidade", "nao-conformidades")  },
      ],
    },
    {
      title: "Certificações",
      url: "#",
      icon: BadgeCheck,
      items: [
        { title: "Material Cert. (FSC)", url: "#", onClick: nav("Certificações", "Material Cert. (FSC)", "material-fsc") },
        { title: "Auditorias",           url: "#", onClick: nav("Certificações", "Auditorias",           "auditorias")   },
      ],
    },
    {
      title: "Usuários",
      url: "#",
      icon: UserCog,
      items: [],
      onTopClick: nav(null, "Usuários", "usuarios"),
    },
    {
      title: "Configurações",
      url: "#",
      icon: Settings,
      items: [],
      onTopClick: nav(null, "Configurações", "configuracoes"),
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center justify-center py-3">
        <a href="#" onClick={nav(null, "Home", "home")}>
          <img src="/LOGO%20CONCREM.png" alt="Concrem" className="h-12 w-auto object-contain" />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={USER} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
