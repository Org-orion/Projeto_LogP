// Fonte única de verdade para navegação: breadcrumb, sidebar e permissões
// compartilham esta configuração para não divergir.

import { Factory, Home, ShieldCheck, BadgeCheck, Settings, UserCog, Calculator, type LucideIcon } from "lucide-react";

export type NavMeta = { parent: string | null; title: string };

export const NAV_META: Record<string, NavMeta> = {
  home:            { parent: null,                    title: "Home" },
  machines:        { parent: "Produção",               title: "Produção" },
  consumo:         { parent: "Produção",               title: "Uso e Consumo" },
  pedidos:         { parent: "Produção",               title: "Pedidos" },
  metas:           { parent: "Produção",               title: "Metas" },
  leituras:        { parent: "Produção",               title: "Monitoramento" },
  qualidade:       { parent: "Controle de Qualidade",  title: "Gramatura" },
  "material-fsc":  { parent: "Certificações",          title: "Material Cert. (FSC)" },
  auditorias:      { parent: "Certificações",          title: "Auditorias" },
  usuarios:        { parent: null,                    title: "Usuários" },
  configuracoes:   { parent: null,                    title: "Configurações" },
};

export const QUALIDADE_SUB_TITLES: Record<string, string> = {
  gramatura:             "Gramatura",
  recebimento:           "Recebimento de Insumos",
  "nao-conformidades":   "Não Conformidades",
};

export const ALL_SECTIONS = Object.keys(NAV_META);

export const PRODUCAO_SUBS = ["machines", "consumo", "pedidos", "metas", "leituras"];
export const QUALIDADE_SUBS = ["gramatura", "recebimento", "nao-conformidades"];
export const CERTIFICACOES_SUBS = ["material-fsc", "auditorias"];

// Labels exibidos na sidebar pros sub-itens de "Produção"/"Certificações" —
// únicas por aqui (app-sidebar.tsx e o formulário de permissões de usuário
// importam daqui) pra rótulo nunca divergir entre os dois lugares.
export const PRODUCAO_LABELS: Record<string, string> = {
  machines: "Produção",
  consumo: "Uso e Consumo",
  pedidos: "Pedidos",
  metas: "Metas",
  leituras: "Monitoramento",
};

export const CERTIFICACOES_LABELS: Record<string, string> = {
  "material-fsc": "Material Cert. (FSC)",
  auditorias: "Auditorias",
};

// Mesma checagem de permissão hoje feita em Dashboard.tsx — extraída aqui pra
// ser reaproveitada pelo layout de /configuracoes/* (rota real, sem passar
// pelo componente Dashboard da SPA).
export function getAllowedSections(user: { perfil?: string; paginas?: string[] }): string[] {
  const isAdmin = (user.perfil ?? "").toLowerCase() === "administrador";
  return isAdmin ? ALL_SECTIONS : (user.paginas ?? ["home"]);
}

// Subitens de "Configurações" — únicas páginas do app com rota real do Next.js
// (/configuracoes/...); todo o resto do app continua no padrão SPA acima.
export interface ConfigSubItem { id: string; label: string; href: string }
// Estrutura Industrial/Turnos/Metas/Calendário Industrial/Parâmetros do
// Sistema/Segurança/Logs do Sistema/Dashboards foram removidas por não serem
// prioridade no momento (código completo, pode voltar a ser adicionado depois).
export const CONFIGURACOES_SUBS: ConfigSubItem[] = [
  { id: "integracoes",          label: "Integrações",            href: "/configuracoes/integracoes" },
  { id: "aparencia",            label: "Aparência",              href: "/configuracoes/aparencia" },
  { id: "notificacoes",         label: "Notificações",           href: "/configuracoes/notificacoes" },
  { id: "backup",               label: "Backup",                 href: "/configuracoes/backup" },
];

// Subitens de "Controle de Qualidade" — também migrado pra rota real
// (/qualidade/...), no mesmo padrão de Configurações. Visão Geral, Inspeções
// e Indicadores foram removidos por não fazerem parte do trabalho atual de
// Qualidade — só o que já é real/em uso continua aqui.
export const QUALIDADE_ROUTE_SUBS: ConfigSubItem[] = [
  { id: "gramatura",         label: "Gramatura",               href: "/qualidade/gramatura" },
  { id: "recebimento",       label: "Recebimento de Insumos",  href: "/qualidade/recebimento-insumos" },
  { id: "nao-conformidades", label: "Não Conformidades",       href: "/qualidade/nao-conformidades" },
  { id: "planos-acao",       label: "Planos de Ação",          href: "/qualidade/planos-acao" },
];

// Subitens de "Rastreabilidade" — migrado de aba SPA pra rota real
// (/rastreabilidade/...), mesmo padrão de Qualidade. Só um item por enquanto
// (a consulta principal); o mapa (/rastreabilidade/mapa) é acessado a partir
// dela, não pela sidebar diretamente.
export const RASTREABILIDADE_ROUTE_SUBS: ConfigSubItem[] = [
  { id: "consulta", label: "Rastreabilidade", href: "/rastreabilidade" },
];

// Subitens de "Custeio de Produto" — rota real (/custeio/...), mesmo padrão
// de Rastreabilidade/Qualidade. A Fase 1 (import de planilha "matriz" já
// calculada) foi removida — o motor de cálculo próprio (Simulador) substitui
// essa necessidade.
export const CUSTEIO_ROUTE_SUBS: ConfigSubItem[] = [
  { id: "dashboard", label: "Visão Geral", href: "/custeio" },
];

// Subitens de "Administração" (RBAC: Usuários/Perfis/Permissões/Auditoria) —
// mesmo padrão de rota real de Configurações/Qualidade. Reaproveita o mesmo
// id de seção "usuarios" que já existe em NAV_META/paginas — zero impacto nos
// usuários já cadastrados.
export const ADMIN_ROUTE_SUBS: ConfigSubItem[] = [
  { id: "dashboard",    label: "Visão Geral",      href: "/admin" },
  { id: "users",        label: "Usuários",         href: "/admin/users" },
  { id: "roles",        label: "Perfis de Acesso", href: "/admin/roles" },
  { id: "permissions",  label: "Permissões",       href: "/admin/permissions" },
  { id: "audit",        label: "Auditoria",        href: "/admin/audit" },
];

// ── Permissões granulares por sub-página (Qualidade/Administração/Configurações) ──
//
// Essas 3 áreas têm rota real (não SPA) e cada uma agrupa várias sub-páginas.
// Historicamente só existia UM id de permissão por área inteira ("qualidade",
// "usuarios", "configuracoes") — quem tivesse esse id via TODAS as sub-páginas.
// Agora cada sub-página tem seu próprio id composto "grupo:subId" (reaproveita
// o `id` que QUALIDADE_ROUTE_SUBS/ADMIN_ROUTE_SUBS/CONFIGURACOES_SUBS já têm).
//
// Compatibilidade: quem já tinha só o id "cru" do grupo continua com acesso a
// TODAS as sub-páginas dele — hasPageAccess/hasAnyGroupAccess tratam o id cru
// como "acesso total ao grupo". Novas concessões passam a usar sempre os ids
// compostos (ver PAGE_PERMISSION_GROUPS abaixo).

export function hasPageAccess(user: { perfil?: string; paginas?: string[] }, id: string): boolean {
  if ((user.perfil ?? "").toLowerCase() === "administrador") return true;
  const paginas = user.paginas ?? [];
  if (paginas.includes(id)) return true;
  const [group] = id.split(":");
  return group !== id && paginas.includes(group);
}

export function hasAnyGroupAccess(user: { perfil?: string; paginas?: string[] }, groupId: string): boolean {
  if ((user.perfil ?? "").toLowerCase() === "administrador") return true;
  const paginas = user.paginas ?? [];
  return paginas.includes(groupId) || paginas.some((p) => p.startsWith(`${groupId}:`));
}

// Agrupamento usado pelo checklist "Páginas permitidas" (UserForm.tsx) —
// derivado das mesmas listas/labels da sidebar, então nunca lista uma página
// que não existe (nem esquece uma que existe). "Controle de Qualidade",
// "Administração" e "Configurações" listam sub-itens individuais sem um
// checkbox-mestre — mesmo padrão já usado por "Produção"/"Certificações".
export interface PageOption { id: string; label: string }
export interface PagePermissionGroup { grupo: string; pages: PageOption[] }

export const PAGE_PERMISSION_GROUPS: PagePermissionGroup[] = [
  { grupo: "Geral", pages: [{ id: "home", label: NAV_META.home.title }] },
  { grupo: "Produção", pages: PRODUCAO_SUBS.map((id) => ({ id, label: PRODUCAO_LABELS[id] })) },
  {
    grupo: "Rastreabilidade",
    pages: RASTREABILIDADE_ROUTE_SUBS.map((s) => ({ id: `rastreabilidade:${s.id}`, label: s.label })),
  },
  {
    grupo: "Custeio de Produto",
    pages: CUSTEIO_ROUTE_SUBS.map((s) => ({ id: `custeio:${s.id}`, label: s.label })),
  },
  {
    grupo: "Controle de Qualidade",
    pages: QUALIDADE_ROUTE_SUBS.map((s) => ({ id: `qualidade:${s.id}`, label: s.label })),
  },
  { grupo: "Certificações", pages: CERTIFICACOES_SUBS.map((id) => ({ id, label: CERTIFICACOES_LABELS[id] })) },
  {
    // Reaproveita o id de grupo "usuarios" já existente em NAV_META/paginas.
    grupo: "Administração",
    pages: ADMIN_ROUTE_SUBS.map((s) => ({ id: `usuarios:${s.id}`, label: s.label })),
  },
  {
    grupo: "Configurações",
    pages: CONFIGURACOES_SUBS.map((s) => ({ id: `configuracoes:${s.id}`, label: s.label })),
  },
];

// Mesmos ícones já usados em app-sidebar.tsx — reaproveitados aqui (não
// duplicados) para o Workspace de abas nunca precisar inventar um novo.
export const SECTION_ICON: Record<string, LucideIcon> = {
  home: Home,
  machines: Factory,
  consumo: Factory,
  pedidos: Factory,
  metas: Factory,
  leituras: Factory,
  qualidade: ShieldCheck,
  "material-fsc": BadgeCheck,
  auditorias: BadgeCheck,
  usuarios: UserCog,
  configuracoes: Settings,
};

export const ROUTE_MODULE_ICON: Record<string, LucideIcon> = {
  "/qualidade": ShieldCheck,
  "/configuracoes": Settings,
  "/admin": UserCog,
  "/rastreabilidade": Factory,
  "/custeio": Calculator,
};
