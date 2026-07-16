"use client";

import { useEffect, useState } from "react";
import {
  useMotionValue, useSpring, useTransform, useReducedMotion,
  type MotionValue,
} from "framer-motion";

export const PARALLAX_SPRING = { stiffness: 45, damping: 20, mass: 1 };

// Deslocamento máximo (px) para uma camada de intensidade 1 (máx. 20px pedido
// para o fundo); outras camadas escalam esse valor por intensidade.
const BASE_MAX_PX = 20;

/**
 * Acompanha a posição do cursor (normalizada de -1 a 1 em relação ao centro
 * da tela) para alimentar o parallax do fundo do login. Fica inerte em
 * mobile/touch e quando o usuário pediu `prefers-reduced-motion`.
 */
export function useParallaxMouse() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion || isCoarsePointer) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    function handlePointerMove(e: PointerEvent) {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion, mx, my]);

  return { mx, my, enabled, prefersReducedMotion: !!prefersReducedMotion };
}

/**
 * Deriva um deslocamento x/y suavizado por spring para uma camada, a partir
 * dos valores brutos de mouse. `intensity` escala o deslocamento máximo;
 * `invert` inverte o sentido (usado no painel de login, que "flutua" contra
 * o fundo).
 */
export function useParallaxLayer(
  mx: MotionValue<number>,
  my: MotionValue<number>,
  { intensity = 1, invert = false }: { intensity?: number; invert?: boolean } = {},
) {
  const sign = invert ? -1 : 1;
  const range = BASE_MAX_PX * intensity * sign;
  const rawX = useTransform(mx, [-1, 1], [-range, range]);
  const rawY = useTransform(my, [-1, 1], [-range, range]);
  const x = useSpring(rawX, PARALLAX_SPRING);
  const y = useSpring(rawY, PARALLAX_SPRING);
  return { x, y };
}
