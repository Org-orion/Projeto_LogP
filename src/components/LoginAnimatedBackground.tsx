"use client";

import { motion, type MotionValue } from "framer-motion";
import { Leaf } from "lucide-react";
import { useParallaxLayer } from "@/hooks/useParallaxMouse";

interface LoginAnimatedBackgroundProps {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  enabled: boolean;
  prefersReducedMotion: boolean;
}

// Fundo decorativo do login: qualquer imagem em public/ (escura, corporativa,
// industrial, natural ou abstrata) com parallax 3D pelo mouse + zoom
// cinematográfico contínuo. Os overlays (escurecimento, lavagem verde,
// vinheta) garantem legibilidade e identidade visual mesmo trocando a foto —
// para trocar, basta apontar BACKGROUND_IMAGE para outro arquivo em public/.
// Some tudo isso quando o usuário pede menos movimento.
const BACKGROUND_IMAGE = "/login-bg-forest.jpg";

export function LoginAnimatedBackground({ mx, my, enabled, prefersReducedMotion }: LoginAnimatedBackgroundProps) {
  const photo     = useParallaxLayer(mx, my, { intensity: 1 });
  const watermark = useParallaxLayer(mx, my, { intensity: 1.5 });

  return (
    <div className="lab-root" aria-hidden="true">
      {/* Camada 1 — foto de fundo (intensidade 1) + zoom cinematográfico */}
      <motion.div
        className="lab-photo"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          x: enabled ? photo.x : 0,
          y: enabled ? photo.y : 0,
          scale: prefersReducedMotion ? 1.08 : undefined,
          willChange: "transform",
        }}
        animate={prefersReducedMotion ? undefined : { scale: [1.05, 1.1] }}
        transition={prefersReducedMotion ? undefined : {
          duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut",
        }}
      />

      {/* Camada 2 — overlays (escurecimento + lavagem verde + vinheta): garantem
          legibilidade e identidade de marca com QUALQUER imagem de fundo,
          não só a foto atual. */}
      <div className="lab-scrim" />
      <div className="lab-greenwash" />
      <div className="lab-vignette" />

      {/* Camada 3 — logotipo gigante em marca d'água (intensidade 1.5 — se move diferente da foto, dá profundidade) */}
      <motion.div
        className="lab-watermark"
        style={{
          x: enabled ? watermark.x : 0,
          y: enabled ? watermark.y : 0,
          willChange: "transform",
        }}
      >
        <Leaf style={{ width: "min(95vw, 1400px)", height: "min(95vw, 1400px)" }} strokeWidth={0.4} />
      </motion.div>

      <style>{`
        .lab-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: hsl(var(--secondary));
        }
        .lab-photo {
          position: absolute;
          inset: -4%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .lab-scrim {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.28);
        }
        .lab-greenwash {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(6, 22, 14, 0.45) 0%,
            rgba(0, 0, 0, 0.05) 45%,
            rgba(6, 22, 14, 0.4) 100%
          );
        }
        .lab-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.5) 100%);
        }
        .lab-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          translate: -50% -50%;
          color: #fff;
          opacity: 0.05;
        }
      `}</style>
    </div>
  );
}
