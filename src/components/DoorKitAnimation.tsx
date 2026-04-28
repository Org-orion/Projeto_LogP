"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion, useAnimation, useInView, AnimatePresence,
  useMotionValue, useTransform, useSpring,
} from "framer-motion";

const E_LAUNCH: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_SETTLE: [number, number, number, number] = [0.43, 0.13, 0.23, 0.96];
const VERDE = "#216C3B";
const VERDE_DARK = "#1a3d22";

const ALZ_W = 72,  ALZ_H = 286;
const BAT_W = 118, BAT_H = 328;
const POR_W = 190, POR_H = 366;

const PX_ALZ = -258;
const PX_BAT = -68;
const PX_POR = 140;

const CARD_W = 118;
const LINE_H = 36;
const LINE_V = 20;

function pause(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function ProductImg({ src, active }: { src: string; active: boolean }) {
  return (
    <>
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: active
            ? `0 0 0 2px ${VERDE}, 0 20px 60px rgba(33,108,59,0.22), 0 6px 16px rgba(0,0,0,0.1)`
            : `0 14px 44px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.07)`,
          transition: "box-shadow 0.3s",
          borderRadius: 16,
        }}
      />
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden"
        style={{ background: "#f8f9f7", border: "1px solid rgba(33,108,59,0.08)" }}
      >
        <img
          src={src} alt="" draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", pointerEvents: "none" }}
        />
        <AnimatePresence>
          {active && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              initial={{ opacity: 0.28 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.65 }}
              style={{ background: "rgba(33,108,59,0.14)" }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function LabelCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{
      width: CARD_W,
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(33,108,59,0.14)",
      borderRadius: 8,
      padding: "8px 11px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)",
      backdropFilter: "blur(6px)",
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: VERDE_DARK, letterSpacing: "0.07em", textTransform: "uppercase", lineHeight: 1 }}>{title}</p>
      <p style={{ fontSize: 9, color: "rgba(15,58,34,0.55)", lineHeight: 1.45, marginTop: 4 }}>{desc}</p>
    </div>
  );
}

// Horizontal label — dot · line · card (or reverse for "left" side)
function HorizLabel({ title, desc, side, dotX, dotY, visible, delay }: {
  title: string; desc: string;
  side: "left" | "right";
  dotX: number; dotY: number;
  visible: boolean; delay: number;
}) {
  const isLeft = side === "left";
  return (
    <motion.div
      className="absolute flex items-center pointer-events-none"
      style={{
        ...(isLeft
          ? { right: `calc(50% + ${-dotX}px)`, flexDirection: "row-reverse" }
          : { left: `calc(50% + ${dotX}px)`,  flexDirection: "row" }),
        top: `calc(50% + ${dotY}px)`,
        transform: "translateY(-50%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.38, delay: visible ? delay : 0 }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: VERDE, flexShrink: 0 }} />
      <motion.div
        style={{ width: LINE_H, height: 1, background: "rgba(33,108,59,0.28)", flexShrink: 0, transformOrigin: isLeft ? "right" : "left" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: visible ? 1 : 0 }}
        transition={{ duration: 0.26, delay: visible ? delay + 0.1 : 0 }}
      />
      <motion.div
        initial={{ opacity: 0, x: isLeft ? 6 : -6 }}
        animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : (isLeft ? 6 : -6) }}
        transition={{ duration: 0.28, delay: visible ? delay + 0.22 : 0 }}
      >
        <LabelCard title={title} desc={desc} />
      </motion.div>
    </motion.div>
  );
}

// Vertical label — dot · line · card below
function BelowLabel({ title, desc, dotX, dotY, visible, delay }: {
  title: string; desc: string;
  dotX: number; dotY: number;
  visible: boolean; delay: number;
}) {
  return (
    <motion.div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{ left: `calc(50% + ${dotX}px)`, top: `calc(50% + ${dotY}px)`, transform: "translateX(-50%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.38, delay: visible ? delay : 0 }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: VERDE }} />
      <motion.div
        style={{ width: 1, height: LINE_V, background: "rgba(33,108,59,0.28)", transformOrigin: "top" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: visible ? 1 : 0 }}
        transition={{ duration: 0.22, delay: visible ? delay + 0.1 : 0 }}
      />
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -5 }}
        transition={{ duration: 0.28, delay: visible ? delay + 0.22 : 0 }}
      >
        <LabelCard title={title} desc={desc} />
      </motion.div>
    </motion.div>
  );
}

export function DoorKitAnimation() {
  const stageRef   = useRef<HTMLDivElement>(null);
  const isInView   = useInView(stageRef, { amount: 0.05 });
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const asmRef     = useRef(false);

  const batente = useAnimation();
  const porta   = useAnimation();
  const alizar  = useAnimation();

  const [assembled, setAssembled] = useState(false);
  const [active, setActive]       = useState<"batente" | "porta" | "alizar" | null>(null);

  const mouseX  = useMotionValue(0);
  const mouseY  = useMotionValue(0);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const sRotY   = useSpring(rotateY, { stiffness: 48, damping: 14 });
  const sRotX   = useSpring(rotateX, { stiffness: 48, damping: 14 });

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (!runningRef.current && !asmRef.current) void assemble(); }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAll() {
    asmRef.current = false; setAssembled(false); setActive(null);
    batente.stop(); batente.set({ x: -400, y: 30,  rotate: -8, scale: 0.76, opacity: 0 });
    porta.stop();   porta.set({   x: 0,    y: -28, rotate: 0,  scale: 1.18, opacity: 0 });
    alizar.stop();  alizar.set({  x: 400,  y: -18, rotate: 8,  scale: 0.76, opacity: 0 });
  }

  async function assemble() {
    if (runningRef.current || asmRef.current) return;
    runningRef.current = true; resetAll();
    if (!mountedRef.current) { runningRef.current = false; return; }

    await Promise.all([
      batente.start({ opacity: 1, transition: { duration: 0.5 } }),
      porta.start(  { opacity: 1, transition: { duration: 0.5, delay: 0.12 } }),
      alizar.start( { opacity: 1, transition: { duration: 0.5, delay: 0.24 } }),
    ]);
    await pause(580);
    if (!mountedRef.current) { runningRef.current = false; return; }

    await batente.start({ x: PX_BAT, y: 0, rotate: 0, scale: 1, transition: { duration: 1.28, ease: E_LAUNCH } });
    await pause(210);
    if (!mountedRef.current) { runningRef.current = false; return; }

    await porta.start({ x: PX_POR, y: 0, rotate: 0, scale: 1, transition: { duration: 0.88, ease: E_SETTLE } });
    await pause(280);
    if (!mountedRef.current) { runningRef.current = false; return; }

    await alizar.start({ x: PX_ALZ, y: 0, rotate: 0, scale: 1, transition: { duration: 1.1, ease: E_LAUNCH } });
    await pause(160);
    if (!mountedRef.current) { runningRef.current = false; return; }

    asmRef.current = true; setAssembled(true); runningRef.current = false;

    void batente.start({ y: [0, -4, 0, 3, 0],   transition: { duration: 6.4, repeat: Infinity, ease: "easeInOut" } });
    void porta.start(  { y: [0, -3, 0, 3.5, 0], transition: { duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 } });
    void alizar.start( { y: [0, -4.5, 0, 2.5, 0], transition: { duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 1.4 } });
  }

  useEffect(() => {
    if (!isInView && asmRef.current) { runningRef.current = false; resetAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  function handleClick(id: "batente" | "porta" | "alizar") {
    if (!asmRef.current) return;
    setActive(a => a === id ? null : id);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!stageRef.current || !assembled) return;
    const r = stageRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top)  / r.height - 0.5);
  }
  function handleMouseLeave() { mouseX.set(0); mouseY.set(0); }

  return (
    <div
      ref={stageRef}
      className="relative w-full select-none overflow-hidden"
      style={{
        height: 480,
        background: "linear-gradient(160deg, #f4f7f4 0%, #ecf1ed 100%)",
        borderTop: "1px solid rgba(33,108,59,0.07)",
        cursor: assembled ? "crosshair" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(33,108,59,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* 3-D perspective wrapper */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: 1200 }}>
        <motion.div style={{ rotateY: sRotY, rotateX: sRotX, transformStyle: "preserve-3d" }}>
          {/* origin = stage center */}
          <div className="relative" style={{ width: 0, height: 0 }}>

            {/* Alizar */}
            <motion.div
              animate={alizar}
              className="absolute cursor-pointer"
              style={{ width: ALZ_W, height: ALZ_H, top: -ALZ_H / 2, left: -ALZ_W / 2, zIndex: 1 }}
              whileHover={assembled ? { scale: 1.06, transition: { duration: 0.18 } } : undefined}
              onClick={() => handleClick("alizar")}
            >
              <ProductImg src="/images/alizar-bianco.jpg" active={active === "alizar"} />
            </motion.div>

            {/* Batente */}
            <motion.div
              animate={batente}
              className="absolute cursor-pointer"
              style={{ width: BAT_W, height: BAT_H, top: -BAT_H / 2, left: -BAT_W / 2, zIndex: 2 }}
              whileHover={assembled ? { scale: 1.04, transition: { duration: 0.18 } } : undefined}
              onClick={() => handleClick("batente")}
            >
              <ProductImg src="/images/batente-melaminico.jpg" active={active === "batente"} />
            </motion.div>

            {/* Porta */}
            <motion.div
              animate={porta}
              className="absolute cursor-pointer"
              style={{ width: POR_W, height: POR_H, top: -POR_H / 2, left: -POR_W / 2, zIndex: 3 }}
              whileHover={assembled ? { scale: 1.025, transition: { duration: 0.18 } } : undefined}
              onClick={() => handleClick("porta")}
            >
              <ProductImg src="/images/porta-uv-branco.jpg" active={active === "porta"} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Labels (absolute to stage, appear after assembly) ── */}

      {/* Alizar — to the LEFT */}
      <HorizLabel
        title="Alizar"
        desc="Acabamento que proporciona estética e proteção"
        side="left"
        dotX={PX_ALZ - ALZ_W / 2 - 8}
        dotY={-ALZ_H * 0.22}
        visible={assembled}
        delay={0.15}
      />

      {/* Batente — BELOW */}
      <BelowLabel
        title="Batente"
        desc="Estrutura resistente que sustenta e fixa a porta"
        dotX={PX_BAT}
        dotY={BAT_H / 2 - 2}
        visible={assembled}
        delay={0.28}
      />

      {/* Porta — to the RIGHT */}
      <HorizLabel
        title="Porta"
        desc="Painel desenvolvido com materiais de alta qualidade"
        side="right"
        dotX={PX_POR + POR_W / 2 + 8}
        dotY={-POR_H * 0.22}
        visible={assembled}
        delay={0.08}
      />

      {/* ── Nav dots ── */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
        {(["alizar", "batente", "porta"] as const).map(id => (
          <button
            key={id}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
            onClick={() => { if (asmRef.current) setActive(a => a === id ? null : id); }}
            style={{
              width: 5,
              height: active === id ? 20 : 5,
              borderRadius: 99,
              background: active === id ? VERDE : "rgba(33,108,59,0.25)",
              border: "none", cursor: "pointer",
              transition: "all 0.3s", padding: 0,
            }}
          />
        ))}
      </div>

      {/* ── Scroll hint (before assembly) ── */}
      <AnimatePresence>
        {!assembled && (
          <motion.div
            className="absolute bottom-5 left-6 flex items-center gap-2 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <motion.svg width="14" height="22" viewBox="0 0 14 22" fill="none"
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
              <rect x="0.7" y="0.7" width="12.6" height="20.6" rx="6.3" stroke="rgba(33,108,59,0.32)" strokeWidth="1.4"/>
              <rect x="6" y="4" width="2" height="5" rx="1" fill="rgba(33,108,59,0.4)"/>
            </motion.svg>
            <span style={{ fontSize: 10, color: "rgba(33,108,59,0.48)", fontWeight: 500 }}>
              Role para ver a montagem
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drag to rotate hint (after assembly) ── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            className="absolute bottom-5 right-14 flex items-center gap-2 pointer-events-none"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 0.65, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <motion.svg width="18" height="18" viewBox="0 0 18 18" fill="none"
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
              <path d="M5.5 8V4.5C5.5 3.67 6.17 3 7 3C7.83 3 8.5 3.67 8.5 4.5V8M8.5 8V3.5C8.5 2.67 9.17 2 10 2C10.83 2 11.5 2.67 11.5 3.5V8M11.5 8V5C11.5 4.17 12.17 3.5 13 3.5C13.83 3.5 14.5 4.17 14.5 5V10C14.5 13.04 12.04 15.5 9 15.5H8C6.4 15.5 4.96 14.8 3.96 13.68L2.5 11.5"
                stroke="rgba(33,108,59,0.45)" strokeWidth="1.3" strokeLinecap="round"/>
            </motion.svg>
            <span style={{ fontSize: 10, color: "rgba(33,108,59,0.48)", fontWeight: 500 }}>
              Arraste para rotacionar
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
