import { Factory, Cog, BarChart3, ClipboardList, Settings, HelpCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const MACHINES = [
  { id: "AQ017", name: "AQ017 - Prensa Fria", icon: Cog },
  { id: "AQ009", name: "AQ009 - Seccionadora", icon: Cog },
  { id: "AQ012", name: "AQ012 - Coladeira", icon: Cog },
  { id: "AQ005", name: "AQ005 - Esquadrejadeira", icon: Cog },
  { id: "AQ021", name: "AQ021 - Tupia", icon: Cog },
];

const MENU_ITEMS = [
  { id: "relatorios", name: "Relatórios", icon: BarChart3 },
  { id: "registros", name: "Registros", icon: ClipboardList },
  { id: "configuracoes", name: "Configurações", icon: Settings },
  { id: "ajuda", name: "Ajuda", icon: HelpCircle },
];

interface AppSidebarProps {
  activeMachine: string;
  onMachineSelect: (id: string) => void;
}

export function AppSidebar({ activeMachine, onMachineSelect }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
          <SidebarGroupLabel>Máquinas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MACHINES.map((machine) => (
                <SidebarMenuItem key={machine.id}>
                  <SidebarMenuButton
                    onClick={() => onMachineSelect(machine.id)}
                    isActive={activeMachine === machine.id}
                    tooltip={machine.name}
                  >
                    <machine.icon className="h-4 w-4" />
                    {!collapsed && <span>{machine.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton tooltip={item.name}>
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
