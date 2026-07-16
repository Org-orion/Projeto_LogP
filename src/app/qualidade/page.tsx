import { redirect } from "next/navigation";

// Visão Geral foi removida (não fazia parte do trabalho atual de Qualidade).
// Sem uma página própria em "/qualidade", o breadcrumb "Controle de
// Qualidade" (ver RouteShell) ficaria linkando pra uma rota inexistente —
// este redirect resolve isso apontando pro primeiro item real do módulo.
export default function QualidadeIndexPage() {
  redirect("/qualidade/gramatura");
}
