"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useInView,
  AnimatePresence,
} from "framer-motion";

// ── Easing ───────────────────────────────────────────────────────────────────
const E_LAUNCH: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_SETTLE: [number, number, number, number] = [0.43, 0.13, 0.23, 0.96];

// ── Layout constants ─────────────────────────────────────────────────────────
const DOOR_W = 196;
const DOOR_H = 316;
const SIDE_W = 148;
const SIDE_H = 240;
const GAP    = 10;

// Assembled X from stage center
const AX_BAT = -(DOOR_W / 2 + GAP + SIDE_W / 2); // left of door
const AX_POR = 0;
const AX_ALZ =  (DOOR_W / 2 + GAP + SIDE_W / 2); // right of door

// Right edge of alizar card (= callout anchor X from stage center)
const CALLOUT_START_X = AX_ALZ + SIDE_W / 2 + 10;

const VERDE      = "#216C3B";
const VERDE_DARK = "#1a3d22";

function pause(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Card component ───────────────────────────────────────────────────────────
function Card({
  src, fit, pos, tall, active,
}: {
  src: string;
  fit: "cover" | "contain";
  pos?: string;
  tall?: boolean;
  active: boolean;
}) {
  return (
    <>
      <div
        className="absolute inset-0 rounded-2xl transition-shadow duration-300"
        style={{
          boxShadow: active
            ? `0 0 0 2px ${VERDE}, 0 18px 56px rgba(33,108,59,0.2), 0 4px 14px rgba(0,0,0,0.1)`
            : `0 10px 36px rgba(0,0,0,0.11), 0 3px 8px rgba(0,0,0,0.07)`,
        }}
      />
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid rgba(33,108,59,0.1)" }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: fit,
            objectPosition: pos ?? "center",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        {/* soft top/bottom fade for door card */}
        {tall && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, transparent 18%, transparent 82%, rgba(255,255,255,0.18) 100%)",
            }}
          />
        )}
        {/* click pulse */}
        <AnimatePresence>
          {active && (
            <motion.div
              key="pulse"
              className="absolute inset-0 rounded-2xl pointer-events-none"
              initial={{ opacity: 0.38 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ background: `rgba(33,108,59,0.18)` }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Callout annotation row ────────────────────────────────────────────────────
function CalloutRow({
  label, desc, yOffset, visible, delay,
}: {
  label: string;
  desc: string;
  yOffset: number; // from vertical center of stage
  visible: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute flex items-center pointer-events-none"
      style={{
        left: `calc(50% + ${CALLOUT_START_X}px)`,
        top:  "50%",
        transform: `translateY(calc(-50% + ${yOffset}px))`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, delay: visible ? delay : 0 }}
    >
      {/* dot */}
      <div className="relative shrink-0" style={{ width: 7, height: 7 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: VERDE }} />
        <div
          className="absolute rounded-full"
          style={{ inset: -3, border: "1.5px solid rgba(33,108,59,0.25)", borderRadius: "50%" }}
        />
      </div>

      {/* line */}
      <motion.div
        className="shrink-0"
        style={{ height: 1, background: "rgba(33,108,59,0.3)", transformOrigin: "left" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: visible ? 1 : 0 }}
        transition={{ duration: 0.3, delay: visible ? delay + 0.08 : 0, ease: E_LAUNCH }}
      >
        <div style={{ width: 52 }} />
      </motion.div>

      {/* text */}
      <motion.div
        className="ml-2.5"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -5 }}
        transition={{ duration: 0.3, delay: visible ? delay + 0.24 : 0 }}
      >
        <p
          className="text-[11px] font-extrabold uppercase tracking-[0.15em] leading-none"
          style={{ color: VERDE_DARK }}
        >
          {label}
        </p>
        <p
          className="text-[9.5px] leading-snug mt-[3px]"
          style={{ color: "rgba(30,60,35,0.52)", maxWidth: 148 }}
        >
          {desc}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Dimension line (top horizontal marker) ────────────────────────────────────
function DimBar({
  label, xLeft, xRight, y, visible, delay,
}: {
  label: string;
  xLeft: number; // from stage center
  xRight: number;
  y: number;     // from stage top
  visible: boolean;
  delay: number;
}) {
  const len = xRight - xLeft;
  return (
    <motion.div
      className="absolute pointer-events-none flex items-center"
      style={{
        left:  `calc(50% + ${xLeft}px)`,
        top:   y,
        width: len,
        height: 16,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, delay: visible ? delay : 0 }}
    >
      {/* left tick */}
      <div style={{ width: 1, height: 10, background: "rgba(33,108,59,0.28)", marginRight: 1 }} />
      {/* line */}
      <motion.div
        style={{ flex: 1, height: 1, background: "rgba(33,108,59,0.22)", transformOrigin: "left" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: visible ? 1 : 0 }}
        transition={{ duration: 0.5, delay: visible ? delay + 0.08 : 0, ease: E_LAUNCH }}
      />
      {/* right tick */}
      <div style={{ width: 1, height: 10, background: "rgba(33,108,59,0.28)", marginLeft: 1 }} />
      {/* label */}
      <span
        className="absolute text-[9px] font-mono tracking-wide"
        style={{
          color: "rgba(33,108,59,0.38)",
          left: "50%",
          top: -12,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DoorKitAnimation() {
  const stageRef   = useRef<HTMLDivElement>(null);
  const isInView   = useInView(stageRef, { amount: 0.35 });
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const asmRef     = useRef(false);

  const batente = useAnimation();
  const porta   = useAnimation();
  const alizar  = useAnimation();

  const [assembled, setAssembled] = useState(false);
  const [active, setActive]       = useState<"batente" | "porta" | "alizar" | null>(null);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  function resetAll() {
    asmRef.current = false;
    setAssembled(false);
    setActive(null);
    batente.stop(); batente.set({ x: -360, y: 28,  rotate: -7, scale: 0.78, opacity: 0 });
    porta.stop();   porta.set({   x: 0,    y: -24, rotate: 0,  scale: 1.14, opacity: 0 });
    alizar.stop();  alizar.set({  x: 360,  y: -16, rotate: 7,  scale: 0.78, opacity: 0 });
  }

  async function assemble() {
    if (runningRef.current || asmRef.current) return;
    runningRef.current = true;
    resetAll();
    if (!mountedRef.current) { runningRef.current = false; return; }

    // Fade in
    await Promise.all([
      batente.start({ opacity: 1, transition: { duration: 0.52 } }),
      porta.start(  { opacity: 1, transition: { duration: 0.52, delay: 0.13 } }),
      alizar.start( { opacity: 1, transition: { duration: 0.52, delay: 0.26 } }),
    ]);

    await pause(700);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // Step 1 — batente slides in
    await batente.start({
      x: AX_BAT, y: 0, rotate: 0, scale: 1,
      transition: { duration: 1.3, ease: E_LAUNCH },
    });

    await pause(240);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // Step 2 — door settles
    await porta.start({
      x: 0, y: 0, rotate: 0, scale: 1,
      transition: { duration: 0.92, ease: E_SETTLE },
    });

    await pause(320);
    if (!mountedRef.current) { runningRef.current = false; return; }

    // Step 3 — alizar closes
    await alizar.start({
      x: AX_ALZ, y: 0, rotate: 0, scale: 1,
      transition: { duration: 1.14, ease: E_LAUNCH },
    });

    await pause(200);
    if (!mountedRef.current) { runningRef.current = false; return; }

    asmRef.current = true;
    setAssembled(true);
    runningRef.current = false;

    // Idle float
    void batente.start({ y: [0, -3.5, 0, 2.5, 0], transition: { duration: 6.2, repeat: Infinity, ease: "easeInOut" } });
    void porta.start(  { y: [0, -2.5, 0, 3.0, 0], transition: { duration: 7.0, repeat: Infinity, ease: "easeInOut", delay: 0.9 } });
    void alizar.start( { y: [0, -4.0, 0, 2.0, 0], transition: { duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 1.6 } });
  }

  useEffect(() => {
    if (isInView && !runningRef.current && !asmRef.current) void assemble();
    if (!isInView) { runningRef.current = false; resetAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  function handleClick(id: "batente" | "porta" | "alizar") {
    if (!asmRef.current) return;
    setActive(id);
    setTimeout(() => setActive(null), 650);
  }

  return (
    <div
      ref={stageRef}
      className="relative w-full overflow-hidden select-none"
      style={{
        height: 440,
        background: "linear-gradient(165deg, #f3f8f4 0%, #edf3ef 55%, #e9f1eb 100%)",
        borderTop: "1px solid rgba(33,108,59,0.07)",
        borderBottom: "1px solid rgba(33,108,59,0.07)",
      }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(33,108,59,0.065) 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
        }}
      />

      {/* ── Dimension bars (top) ── */}
      {/* Full kit span */}
      <DimBar
        label="Kit completo"
        xLeft={AX_BAT - SIDE_W / 2}
        xRight={AX_ALZ + SIDE_W / 2}
        y={28}
        visible={assembled}
        delay={0.25}
      />
      {/* Door span */}
      <DimBar
        label="Porta"
        xLeft={-DOOR_W / 2}
        xRight={DOOR_W / 2}
        y={46}
        visible={assembled}
        delay={0.38}
      />

      {/* ── 3 Cards ── */}
      <div className="absolute inset-0 flex items-center justify-center">

        {/* Batente */}
        <motion.div
          animate={batente}
          className="absolute cursor-pointer"
          style={{ width: SIDE_W, height: SIDE_H, zIndex: assembled ? 1 : 2 }}
          whileHover={assembled ? { scale: 1.045, transition: { duration: 0.2 } } : undefined}
          onClick={() => handleClick("batente")}
        >
          <Card src="/images/batente-melaminico.jpg" fit="contain" active={active === "batente"} />
        </motion.div>

        {/* Porta */}
        <motion.div
          animate={porta}
          className="absolute cursor-pointer"
          style={{ width: DOOR_W, height: DOOR_H, zIndex: 3 }}
          whileHover={assembled ? { scale: 1.03, transition: { duration: 0.2 } } : undefined}
          onClick={() => handleClick("porta")}
        >
          <Card src="/images/porta-pivotante.jpg" fit="cover" pos="center 10%" tall active={active === "porta"} />
        </motion.div>

        {/* Alizar */}
        <motion.div
          animate={alizar}
          className="absolute cursor-pointer"
          style={{ width: SIDE_W, height: SIDE_H, zIndex: assembled ? 2 : 2 }}
          whileHover={assembled ? { scale: 1.045, transition: { duration: 0.2 } } : undefined}
          onClick={() => handleClick("alizar")}
        >
          <Card src="/images/alizar-bianco.jpg" fit="contain" active={active === "alizar"} />
        </motion.div>
      </div>

      {/* ── Callout annotations (right side) ── */}
      <CalloutRow
        label="Alizar"
        desc="Acabamento estético que enquadra e protege a porta"
        yOffset={-SIDE_H / 2 + 32}
        visible={assembled}
        delay={0.1}
      />
      <CalloutRow
        label="Porta"
        desc="Fabricada com materiais de alta qualidade e durabilidade"
        yOffset={6}
        visible={assembled}
        delay={0.24}
      />
      <CalloutRow
        label="Batente"
        desc="Estrutura que fixa, alinha e veda a porta na parede"
        yOffset={SIDE_H / 2 - 28}
        visible={assembled}
        delay={0.40}
      />

      {/* ── Vertical left dimension tick (door height) ── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            className="absolute pointer-events-none flex flex-col items-center"
            style={{
              left: `calc(50% + ${AX_BAT - SIDE_W / 2 - 22}px)`,
              top:  "50%",
              transform: `translateY(calc(-50%))`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div style={{ width: 8, height: 1, background: "rgba(33,108,59,0.25)" }} />
            <motion.div
              style={{ width: 1, flex: 1, background: "rgba(33,108,59,0.2)", transformOrigin: "top" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.55, delay: 0.42, ease: E_LAUNCH }}
            >
              <div style={{ height: DOOR_H }} />
            </motion.div>
            <div style={{ width: 8, height: 1, background: "rgba(33,108,59,0.25)" }} />
            <span
              className="text-[9px] font-mono mt-1.5"
              style={{ color: "rgba(33,108,59,0.38)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kit label bottom center ── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, delay: 0.52 }}
          >
            <div
              className="flex items-center gap-2.5 px-5 py-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(33,108,59,0.14)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 12px rgba(33,108,59,0.08)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: VERDE }} />
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: VERDE_DARK }}
              >
                Kit de Porta Completo · Clique em um componente para destacar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
