"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type SubItem = {
  title: string
  url: string
  onClick?: () => void
  isActive?: boolean
  /** Rota real do Next.js (ex.: /configuracoes/turnos) — usa <Link> em vez de onClick. */
  href?: string
}

type NavItem = {
  title: string
  url: string
  icon?: ElementType
  isActive?: boolean
  onTopClick?: () => void
  items?: SubItem[]
  /** Rota real do Next.js — usa <Link> em vez de onClick. */
  href?: string
}

// Item ativo: fundo emerald-500@12% + texto branco + barra vertical emerald-400.
// Inativo: texto emerald-50@70% (nível 1) / emerald-50@55% (subitem). Hover:
// emerald-500@10% (nível 1) / emerald-500@7% (subitem) + texto branco.
const ITEM_BASE =
  "relative text-emerald-50/70 hover:bg-emerald-500/10 hover:text-white " +
  "data-[active=true]:bg-emerald-500/12 data-[active=true]:font-medium data-[active=true]:text-white " +
  "data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1 " +
  "data-[active=true]:before:bottom-1 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full " +
  "data-[active=true]:before:bg-emerald-400 data-[active=true]:before:content-['']"

const SUBITEM_BASE =
  "relative text-emerald-50/55 hover:bg-emerald-500/7 hover:text-white " +
  "data-[active=true]:bg-emerald-500/12 data-[active=true]:font-medium data-[active=true]:text-white " +
  "data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1 " +
  "data-[active=true]:before:bottom-1 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full " +
  "data-[active=true]:before:bg-emerald-400 data-[active=true]:before:content-['']"

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-emerald-100/50">Navegação</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} className={ITEM_BASE}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto text-emerald-200/50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-emerald-900/50">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={subItem.isActive} className={SUBITEM_BASE}>
                          {subItem.href ? (
                            <Link href={subItem.href}>
                              <span>{subItem.title}</span>
                            </Link>
                          ) : (
                            <a href={subItem.url} onClick={subItem.onClick}>
                              <span>{subItem.title}</span>
                            </a>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild isActive={item.isActive} className={ITEM_BASE}>
                {item.href ? (
                  <Link href={item.href}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                ) : (
                  <a href={item.url} onClick={item.onTopClick}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
