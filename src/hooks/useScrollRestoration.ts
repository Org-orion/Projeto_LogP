import { useEffect, useRef } from "react";

const PREFIX = "logp_scroll_";

// Salva/restaura a posição de scroll de um contêiner, chaveada por rota —
// usada pelas abas de rota real (Qualidade/Configurações/Administração), que
// o Next.js desmonta ao navegar (sem keep-alive possível sem mexer em cada
// página). sessionStorage, não localStorage: é só uma conveniência de UX
// desta aba do navegador, não precisa sobreviver a login/logout.
export function useScrollRestoration(key: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const stored = sessionStorage.getItem(PREFIX + key);
    if (stored) el.scrollTop = Number(stored) || 0;

    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(PREFIX + key, String(el!.scrollTop));
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [key]);

  return ref;
}
