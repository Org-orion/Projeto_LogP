"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigation } from "@/context/navigation-context";
import {
  NAV_META, QUALIDADE_SUB_TITLES, SECTION_ICON, ROUTE_MODULE_ICON,
  QUALIDADE_ROUTE_SUBS, CONFIGURACOES_SUBS, ADMIN_ROUTE_SUBS, RASTREABILIDADE_ROUTE_SUBS,
  getAllowedSections, type ConfigSubItem,
} from "@/lib/nav-items";
import { goToSpaSection } from "@/lib/spa-bridge";

export type TabKind = "spa" | "route";

export interface WorkspaceTab {
  id: string;
  kind: TabKind;
  /** Só pra abas kind "spa". */
  section?: string;
  subSection?: string;
  /** Só pra abas kind "route". */
  href?: string;
  /** Indicador de alterações não salvas — infraestrutura pronta; nenhuma tela chama setTabDirty ainda. */
  dirty?: boolean;
}

interface PersistedShape {
  userId: string | number;
  tabs: Array<Omit<WorkspaceTab, "dirty">>;
  activeId: string;
}

interface WorkspaceContextType {
  tabs: WorkspaceTab[];
  activeId: string;
  activate: (id: string) => void;
  requestClose: (id: string) => void;
  closeOthers: (id: string) => void;
  closeToRight: (id: string) => void;
  duplicate: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  setTabDirty: (id: string, dirty: boolean) => void;
  refresh: (id: string) => void;
  refreshKeys: Record<string, number>;
}

const STORAGE_KEY = "logp_workspace_tabs_v1";
export const HOME_TAB_ID = "spa:home";
const HOME_TAB: WorkspaceTab = { id: HOME_TAB_ID, kind: "spa", section: "home" };

function spaTabId(section: string, subSection?: string) {
  return `spa:${section}${subSection ? `:${subSection}` : ""}`;
}
function routeTabId(href: string) {
  return `route:${href}`;
}

const ROUTE_GROUPS: { prefix: string; subs: ConfigSubItem[]; parentLabel: string }[] = [
  { prefix: "/qualidade", subs: QUALIDADE_ROUTE_SUBS, parentLabel: "Controle de Qualidade" },
  { prefix: "/configuracoes", subs: CONFIGURACOES_SUBS, parentLabel: "Configurações" },
  { prefix: "/admin", subs: ADMIN_ROUTE_SUBS, parentLabel: "Administração" },
  { prefix: "/rastreabilidade", subs: RASTREABILIDADE_ROUTE_SUBS, parentLabel: "Rastreabilidade" },
];

function resolveRouteMeta(pathname: string): { href: string; label: string; icon: LucideIcon } | null {
  for (const group of ROUTE_GROUPS) {
    if (pathname === group.prefix || pathname.startsWith(`${group.prefix}/`)) {
      const sub = group.subs.find((s) => s.href === pathname);
      return {
        href: pathname,
        label: sub?.label ?? group.parentLabel,
        icon: ROUTE_MODULE_ICON[group.prefix] ?? SECTION_ICON.home,
      };
    }
  }
  return null;
}

export function tabLabel(tab: WorkspaceTab): string {
  if (tab.kind === "spa") {
    if (tab.section === "qualidade") return QUALIDADE_SUB_TITLES[tab.subSection ?? "gramatura"];
    return NAV_META[tab.section ?? "home"]?.title ?? "—";
  }
  return resolveRouteMeta(tab.href ?? "")?.label ?? tab.href ?? "—";
}

export function tabIcon(tab: WorkspaceTab): LucideIcon {
  if (tab.kind === "spa") return SECTION_ICON[tab.section ?? "home"] ?? SECTION_ICON.home;
  return resolveRouteMeta(tab.href ?? "")?.icon ?? SECTION_ICON.home;
}

function readLoggedUser(): { id?: string | number; perfil?: string; paginas?: string[] } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("logp_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function hydrate(): { tabs: WorkspaceTab[]; activeId: string } {
  const fallback = { tabs: [HOME_TAB], activeId: HOME_TAB_ID };
  const user = readLoggedUser();
  if (!user) return fallback;
  const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (!raw) return fallback;
  try {
    const parsed: PersistedShape = JSON.parse(raw);
    if (parsed.userId !== user.id || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return fallback;
    const allowed = getAllowedSections(user);
    const restored = parsed.tabs.filter((t) => (
      t.id === HOME_TAB_ID || t.kind === "route" || allowed.includes(t.section ?? "")
    ));
    const withHome = restored.some((t) => t.id === HOME_TAB_ID) ? restored : [HOME_TAB, ...restored];
    const activeId = withHome.some((t) => t.id === parsed.activeId) ? parsed.activeId : HOME_TAB_ID;
    return { tabs: withHome, activeId };
  } catch {
    return fallback;
  }
}

function persist(tabs: WorkspaceTab[], activeId: string) {
  const user = readLoggedUser();
  if (!user || user.id === undefined) return;
  const payload: PersistedShape = {
    userId: user.id,
    tabs: tabs.map(({ dirty: _dirty, ...rest }) => rest),
    activeId,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* quota indisponível — não é crítico */ }
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { active, setSection } = useNavigation();

  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => hydrate().tabs);
  // Estado "cru" — só serve de fallback/valor persistido. A aba realmente
  // ativa (abaixo, `activeId`) é sempre derivada ao vivo do pathname/nav
  // atual, nunca lida diretamente daqui — isso evita o bug em que, logo após
  // uma navegação cross-shell (SPA <-> rota real), a nova instância do
  // Provider hidratava esse estado do localStorage e mostrava a aba antiga
  // destacada por um instante (às vezes perceptível) até um efeito corrigir.
  const [activeIdState, setActiveIdState] = useState<string>(() => hydrate().activeId);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});

  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeIdState);

  const updateTabs = useCallback((next: WorkspaceTab[]) => {
    tabsRef.current = next;
    setTabs(next);
  }, []);
  const updateActiveId = useCallback((id: string) => {
    setActiveIdState(id);
  }, []);

  // Deriva a aba ativa diretamente do pathname (rotas reais) ou do estado de
  // navegação da SPA (`active`) — sempre correto já no primeiro render de
  // qualquer instância do Provider, sem depender de um efeito rodar depois
  // do mount pra "alcançar" a realidade.
  const routeMetaAtual = pathname !== "/" ? resolveRouteMeta(pathname ?? "") : null;
  const activeId = pathname === "/"
    ? spaTabId(active.section, active.subSection)
    : routeMetaAtual
      ? routeTabId(routeMetaAtual.href)
      : activeIdState;
  activeIdRef.current = activeId;

  // Persistência — efeito de segurança (a maioria dos caminhos já persiste
  // de forma síncrona em `activate`, ver comentário lá embaixo).
  useEffect(() => {
    persist(tabs, activeId);
  }, [tabs, activeId]);

  // Sincroniza estado de navegação da SPA (NavigationContext) -> abas.
  // Só é significativo em "/"; fora daqui `active` fica no valor default.
  useEffect(() => {
    if (pathname !== "/") return;
    const id = spaTabId(active.section, active.subSection);
    if (!tabsRef.current.some((t) => t.id === id)) {
      updateTabs([...tabsRef.current, { id, kind: "spa", section: active.section, subSection: active.subSection }]);
    }
    updateActiveId(id);
  }, [pathname, active.section, active.subSection, updateTabs, updateActiveId]);

  // Sincroniza rotas reais (/qualidade, /configuracoes, /admin) -> abas.
  useEffect(() => {
    if (pathname === "/") return;
    const meta = resolveRouteMeta(pathname ?? "");
    if (!meta) return;
    const id = routeTabId(meta.href);
    if (!tabsRef.current.some((t) => t.id === id)) {
      updateTabs([...tabsRef.current, { id, kind: "route", href: meta.href }]);
    }
    updateActiveId(id);
  }, [pathname, updateTabs, updateActiveId]);

  const activate = useCallback((id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    updateActiveId(id);
    // Persiste já, de forma síncrona: navegar pra uma aba de rota (ou voltar
    // pra "/" a partir de uma) desmonta este Provider (rota real = outro
    // layout, outra instância do WorkspaceProvider) antes do efeito de
    // persistência rodar — sem isso a aba recém-ativada poderia "sumir" na
    // hidratação da próxima instância.
    persist(tabsRef.current, id);
    if (tab.kind === "spa") {
      // setSection() só tem efeito dentro do NavigationProvider (só existe em
      // "/"). Se a aba for clicada a partir de uma página de rota real
      // (Qualidade/Configurações/Administração), setSection vira um no-op
      // silencioso — é preciso voltar pra "/" de verdade primeiro, mesma
      // ponte que a sidebar já usa pra esse caso.
      if (pathname === "/") setSection(tab.section ?? "home", tab.subSection);
      else goToSpaSection(router, tab.section ?? "home", tab.subSection);
    } else {
      router.push(tab.href ?? "/");
    }
  }, [setSection, router, updateActiveId, pathname]);

  const doClose = useCallback((id: string) => {
    if (id === HOME_TAB_ID) return;
    const list = tabsRef.current;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const next = list.filter((t) => t.id !== id);
    updateTabs(next);
    if (activeIdRef.current === id) {
      const fallback = next[Math.max(0, idx - 1)] ?? HOME_TAB;
      activate(fallback.id);
    }
  }, [activate, updateTabs]);

  const requestClose = useCallback((id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (tab?.dirty) { setConfirmCloseId(id); return; }
    doClose(id);
  }, [doClose]);

  const closeOthers = useCallback((id: string) => {
    const keep = tabsRef.current.filter((t) => t.id === id || t.id === HOME_TAB_ID);
    updateTabs(keep);
    activate(id);
  }, [activate, updateTabs]);

  const closeToRight = useCallback((id: string) => {
    const list = tabsRef.current;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const next = list.filter((t, i) => i <= idx || t.id === HOME_TAB_ID);
    updateTabs(next);
    if (!next.some((t) => t.id === activeIdRef.current)) activate(id);
  }, [activate, updateTabs]);

  const duplicate = useCallback((id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    const newId = `${tab.id}#${Math.random().toString(36).slice(2, 7)}`;
    const next = [...tabsRef.current, { ...tab, id: newId, dirty: false }];
    updateTabs(next);
    updateActiveId(newId);
    persist(next, newId);
    if (tab.kind === "route") router.push(tab.href ?? "/");
  }, [updateTabs, updateActiveId, router]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === 0 || toIndex === 0 || fromIndex === toIndex) return;
    const list = tabsRef.current;
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateTabs(next);
  }, [updateTabs]);

  const setTabDirty = useCallback((id: string, dirty: boolean) => {
    updateTabs(tabsRef.current.map((t) => (t.id === id ? { ...t, dirty } : t)));
  }, [updateTabs]);

  const refresh = useCallback((id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    if (tab.kind === "route") { router.refresh(); return; }
    setRefreshKeys((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, [router]);

  // Atalhos de teclado. Refs "latest" evitam re-registrar o listener a cada
  // troca de aba. Ressalva: Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+W / Ctrl+T são
  // reservados pelo próprio navegador (Chrome/Edge/Firefox) e o keydown
  // nem chega ao JS da página nesses casos numa aba comum — funcionam se o
  // app rodar como PWA instalado/Electron/kiosk. F4 funciona normalmente.
  const activateRef = useRef(activate);
  activateRef.current = activate;
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "F4") {
        e.preventDefault();
        requestCloseRef.current(activeIdRef.current);
        return;
      }
      if (typing) return;

      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const list = tabsRef.current;
        if (list.length < 2) return;
        const idx = list.findIndex((t) => t.id === activeIdRef.current);
        const dir = e.shiftKey ? -1 : 1;
        const next = list[(idx + dir + list.length) % list.length];
        activateRef.current(next.id);
      } else if (e.ctrlKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        requestCloseRef.current(activeIdRef.current);
      }
      // Ctrl+T: reservado pro botão "+" (abrir módulo) — sem builder de menu definido ainda.
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value: WorkspaceContextType = {
    tabs, activeId, activate, requestClose, closeOthers, closeToRight, duplicate, reorder, setTabDirty, refresh, refreshKeys,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      <AlertDialog open={confirmCloseId !== null} onOpenChange={(open) => { if (!open) setConfirmCloseId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>Deseja realmente fechar esta aba? As alterações não salvas serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCloseId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = confirmCloseId;
                setConfirmCloseId(null);
                if (id) doClose(id);
              }}
            >
              Fechar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace() precisa estar dentro de um WorkspaceProvider");
  return ctx;
}
