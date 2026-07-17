// Ponte entre as rotas reais de /configuracoes/* e o resto do app, que ainda é
// uma SPA de página única (ver src/context/navigation-context.tsx): navegar
// pra uma "seção" da SPA a partir de uma rota real significa voltar pra "/" já
// com a seção certa selecionada. Dashboard.tsx lê "logp_section" do
// localStorage ao montar (mesma chave que setSection() já usa hoje).
export function goToSpaSection(router: { push: (href: string) => void }, section: string, subSection?: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("logp_section", section);
  }
  router.push("/");
  void subSection; // reservado: hoje o Dashboard só restaura a seção, não a subseção
}
