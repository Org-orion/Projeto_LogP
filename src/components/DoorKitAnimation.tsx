"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useInView,
  AnimatePresence,
} from "framer-motion";

// ── Easing curves ────────────────────────────────────────────────────────────
// Decelerating "launch": fast start, settles smoothly
const EASE_DEPLOY: [number, number, number, number] = [0.22, 1, 0.36, 1];
// Precise mid-speed: subtle ease-in, controlled ease-out
const EASE_SETTLE: [number, number, number, number] = [0.43, 0.13, 0.23, 0.96];

// ── Colors ───────────────────────────────────────────────────────────────────
const VERDE       = "#216C3B";
const STAGE_BG    = "#0d2418";

// ── Component definitions ────────────────────────────────────────────────────
const W = 180; // card width  (px)
const H = 284; // card height (px)

// Assembled x positions (from stage center, 20px gaps)
const AX_BATENTE = -(W + 20);  // -200
const AX_PORTA   = 0;
const AX_ALIZAR  =  (W + 20);  //  200

interface Comp {
  id:   "batente" | "porta" | "alizar";
  src:  string;
  tag:  string;
  name: string;
  fit:  "cover" | "contain";
  pos?: string;
  cardBg: string;
  // exploded state
  ex: number; ey: number; er: number; es: number;
  // assembled x
  ax: number;
  z: number;
}

const COMPS: Comp[] = [
  {
    id: "batente",
    src: "/images/batente-melaminico.jpg",
    tag: "Componente 01",
    name: "Batente Melamínico",
    fit: "contain",
    cardBg: "rgba(255,255,255,0.96)",
    ex: -390, ey: 28, er: -8, es: 0.80,
    ax: AX_BATENTE,
    z: 1,
  },
  {
    id: "porta",
    src: "/images/porta-pivotante.jpg",
    tag: "Componente 02",
    name: "Porta Pivotante",
    fit: "cover",
    pos: "center 12%",
    cardBg: "rgba(20,42,28,1)",
    ex: 0, ey: -24, er: 0, es: 1.14,
    ax: AX_PORTA,
    z: 3,
  },
  {
    id: "alizar",
    src: "/images/alizar-bianco.jpg",
    tag: "Componente 03",
    name: "Alizar Bianco",
    fit: "contain",
    cardBg: "rgba(255,255,255,0.96)",
    ex: 390, ey: -14, er: 8, es: 0.80,
    ax: AX_ALIZAR,
    z: 2,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function pause(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Component ────────────────────────────────────────────────────────────────
export function DoorKitAnimation() {
  const stageRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(stageRef, { amount: 0.35 });

  const batente = useAnimation();
  const porta   = useAnimation();
  const alizar  = useAnimation();

  const ctrl: Record<Comp["id"], ReturnType<typeof useAnimation>> = {
    batente, porta, alizar,
  };

  const [assembled, setAssembled]   = useState(false);
  const [active, setActive]         = useState<Comp["id"] | null>(null);
  const runningRef  = useRef(false);
  const assembledRef = useRef(false);
  const mountedRef  = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ── Reset helpers ────────────────────────────────────────────────────────
  function resetAll() {
    assembledRef.current = false;
    setAssembled(false);
    setActive(null);
    COMPS.forEach(c => {
      ctrl[c.id].stop();
      ctrl[c.id].set({
        x: c.ex, y: c.ey, rotate: c.er, scale: c.es, opacity: 0,
      });
    });
  }

  // ── Main assembly sequence ───────────────────────────────────────────────
  async function assemble() {
    if (runningRef.current || assembledRef.current) return;
    runningRef.current = true;

    resetAll();
    if (!mountedRef.current) { runningRef.current = false; return; }

    // 1. Fade in all three (staggered)
    await Promise.all(
      COMPS.map((c, i) =>
        ctrl[c.id].start({
          opacity: 1,
          transition: { duration: 0.5, delay: i * 0.13 },
        })
      )
    );

    // 2. Hold exploded view for a beat
    await pause(700);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // 3. STEP 1 — Batente slides horizontally into frame
    await ctrl.batente.start({
      x: AX_BATENTE,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { duration: 1.3, ease: EASE_DEPLOY },
    });

    await pause(240);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // 4. STEP 2 — Door settles back, aligned inside the frame
    await ctrl.porta.start({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { duration: 0.92, ease: EASE_SETTLE },
    });

    await pause(310);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // 5. STEP 3 — Alizar closes from the outer side
    await ctrl.alizar.start({
      x: AX_ALIZAR,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { duration: 1.15, ease: EASE_DEPLOY },
    });

    await pause(160);
    if (!mountedRef.current) { runningRef.current = false; return; }

    assembledRef.current = true;
    setAssembled(true);
    runningRef.current = false;

    // 6. Idle float — subtle breathing, staggered phases
    void ctrl.batente.start({
      y: [0, -3.5, 0, 2.5, 0],
      transition: { duration: 6.2, repeat: Infinity, ease: "easeInOut" },
    });
    void ctrl.porta.start({
      y: [0, -2.5, 0, 3.2, 0],
      transition: { duration: 7.0, repeat: Infinity, ease: "easeInOut", delay: 0.9 },
    });
    void ctrl.alizar.start({
      y: [0, -4.0, 0, 2.0, 0],
      transition: { duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 1.6 },
    });
  }

  // ── Scroll trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isInView && !runningRef.current && !assembledRef.current) {
      void assemble();
    }
    if (!isInView) {
      runningRef.current = false;
      resetAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  // ── Click handler ─────────────────────────────────────────────────────────
  function handleClick(id: Comp["id"]) {
    if (!assembledRef.current) return;
    setActive(id);
    setTimeout(() => setActive(null), 650);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={stageRef}
      className="relative w-full overflow-hidden select-none"
      style={{
        height: 420,
        background: `radial-gradient(ellipse 140% 100% at 50% 0%, #1a3d28 0%, ${STAGE_BG} 65%)`,
      }}
    >
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Stage vignette — darkens corners for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 35%, rgba(0,0,0,0.42) 100%)",
        }}
      />

      {/* ── Cards ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        {COMPS.map((c, idx) => (
          <motion.div
            key={c.id}
            animate={ctrl[c.id]}
            className="absolute cursor-pointer"
            style={{ width: W, height: H, zIndex: assembled ? c.z : 2 + idx }}
            whileHover={
              assembled
                ? { scale: 1.045, transition: { duration: 0.2, ease: "easeOut" } }
                : undefined
            }
            onClick={() => handleClick(c.id)}
          >
            {/* Glow / shadow ring */}
            <div
              className="absolute inset-0 rounded-2xl transition-all duration-300"
              style={{
                boxShadow:
                  active === c.id
                    ? `0 0 0 2.5px rgba(255,255,255,0.88),
                       0 28px 80px rgba(0,0,0,0.72),
                       0 8px 24px rgba(33,108,59,0.35)`
                    : assembled
                      ? `0 22px 64px rgba(0,0,0,0.58), 0 6px 20px rgba(0,0,0,0.32)`
                      : `0 10px 32px rgba(0,0,0,0.45)`,
              }}
            />

            {/* Card face */}
            <div
              className="relative w-full h-full rounded-2xl overflow-hidden"
              style={{ background: c.cardBg }}
            >
              <img
                src={c.src}
                alt={c.name}
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: c.fit,
                  objectPosition: c.pos ?? "center",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />

              {/* Bottom scrim (all cards) */}
              <div
                className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                style={{
                  background:
                    c.id === "porta"
                      ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)"
                      : "linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 100%)",
                }}
              />

              {/* Click highlight pulse */}
              <AnimatePresence>
                {active === c.id && (
                  <motion.div
                    key="pulse"
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.015 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    style={{ background: "rgba(255,255,255,0.28)" }}
                  />
                )}
              </AnimatePresence>

              {/* Label block (after assembly) */}
              <AnimatePresence>
                {assembled && (
                  <motion.div
                    initial={{ opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.38, delay: idx * 0.09 }}
                    className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-6"
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5"
                      style={{ color: "rgba(140,255,170,0.8)" }}
                    >
                      {c.tag}
                    </p>
                    <p className="text-white text-[13px] font-bold leading-tight drop-shadow-sm">
                      {c.name}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Connector lines between assembled cards ── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Left connector */}
            <div
              className="absolute"
              style={{
                left: `calc(50% + ${AX_BATENTE + W / 2}px)`,
                width: 20,
                height: 1,
                background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
                transform: "translateY(-0px)",
              }}
            />
            {/* Right connector */}
            <div
              className="absolute"
              style={{
                left: `calc(50% + ${AX_PORTA + W / 2}px)`,
                width: 20,
                height: 1,
                background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
                transform: "translateY(-0px)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status badge ── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
          >
            <div
              className="flex items-center gap-2.5 px-5 py-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.09)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: VERDE, boxShadow: `0 0 6px ${VERDE}` }}
              />
              <span className="text-white/55 text-[11px] font-medium tracking-wide">
                Kit completo · Clique em um componente para destacar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
