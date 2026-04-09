"use client";

import { useState, useEffect } from "react";
import { Factory, Cog, BarChart3, ClipboardList, Settings, HelpCircle, ShieldCheck, Home, UserCog, ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// Itens simples (sem sub-menu)
const MENU_ITEMS = [
  { id: "home", name: "Home", icon: Home },
  { id: "machines", name: "Máquinas", icon: Cog },
  { id: "relatorios", name: "Relatórios", icon: BarChart3 },
  { id: "registros", name: "Registros", icon: ClipboardList },
  { id: "usuarios", name: "Usuários", icon: UserCog },
  { id: "configuracoes", name: "Configurações", icon: Settings },
  { id: "ajuda", name: "Ajuda", icon: HelpCircle },
];

// Sub-itens de Controle de Qualidade
const QUALIDADE_SUBS = [
  { id: "gramatura", name: "Gramatura" },
  { id: "recebimento", name: "Recebimento de Insumos" },
];

interface AppSidebarProps {
  activeSection: string;
  onSectionSelect: (id: string) => void;
  allowedSections: string[];
  qualidadeSubSection: string;
  onQualidadeSubSelect: (sub: string) => void;
}

export function AppSidebar({
  activeSection,
  onSectionSelect,
  allowedSections,
  qualidadeSubSection,
  onQualidadeSubSelect,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Expande automaticamente quando a seção qualidade está ativa
  const [qualidadeOpen, setQualidadeOpen] = useState(activeSection === "qualidade");

  useEffect(() => {
    if (activeSection === "qualidade") setQualidadeOpen(true);
  }, [activeSection]);

  const visibleSimple = MENU_ITEMS.filter((item) => allowedSections.includes(item.id));
  const showQualidade = allowedSections.includes("qualidade");

  function handleQualidadeClick() {
    if (activeSection !== "qualidade") {
      onSectionSelect("qualidade");
      setQualidadeOpen(true);
    } else {
      setQualidadeOpen((prev) => !prev);
    }
  }

  function handleSubClick(sub: string) {
    onSectionSelect("qualidade");
    onQualidadeSubSelect(sub);
    setQualidadeOpen(true);
  }

  // Insere "Controle de Qualidade" na posição correta (depois de Máquinas)
  const beforeQualidade = visibleSimple.filter((i) => i.id === "home" || i.id === "machines");
  const afterQualidade = visibleSimple.filter((i) => !["home", "machines"].includes(i.id));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">Controle de Produção</p>
              <p className="text-xs text-muted-foreground truncate">Fábrica de Portas</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* Itens antes de Qualidade */}
              {beforeQualidade.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionSelect(item.id)}
                    isActive={activeSection === item.id}
                    tooltip={item.name}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Controle de Qualidade com dropdown */}
              {showQualidade && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleQualidadeClick}
                    isActive={activeSection === "qualidade"}
                    tooltip="Controle de Qualidade"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Controle de Qualidade</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            qualidadeOpen && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </SidebarMenuButton>

                  {/* Sub-menu (oculto quando sidebar recolhido via CSS do próprio componente) */}
                  {qualidadeOpen && (
                    <SidebarMenuSub>
                      {QUALIDADE_SUBS.map((sub) => (
                        <SidebarMenuSubItem key={sub.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeSection === "qualidade" && qualidadeSubSection === sub.id}
                            size="sm"
                          >
                            <button
                              className="w-full text-left"
                              onClick={() => handleSubClick(sub.id)}
                            >
                              {sub.name}
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Itens depois de Qualidade */}
              {afterQualidade.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionSelect(item.id)}
                    isActive={activeSection === item.id}
                    tooltip={item.name}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">Sistema Industrial v1.0</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
