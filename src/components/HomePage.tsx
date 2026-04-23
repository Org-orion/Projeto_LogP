"use client";

import { useEffect, useState } from "react";
import { DoorKitAnimation } from "./DoorKitAnimation";

const VERDE      = "#216C3B";
const VERDE_DARK = "#194f2c";

function useEntrance() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);
  return on;
}

// ── Callout dot with pulsing ring ────────────────────────────────────────────
function PulseCallout({
  label,
  style,
  delay = 0,
  flip = false,
}: {
  label: string;
  style: React.CSSProperties;
  delay?: number;
  flip?: boolean;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), 750 + delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="absolute flex items-center gap-2"
      style={{
        ...style,
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : "translateY(6px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        flexDirection: flip ? "row-reverse" : "row",
      }}
    >
      <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
        <span className="callout-ring absolute inset-0 rounded-full bg-white" />
        <span className="relative w-2 h-2 rounded-full bg-white block" />
      </div>
      <div
        className="text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap"
        style={{
          background: "rgba(255,255,255,0.92)",
          color: VERDE_DARK,
          backdropFilter: "blur(6px)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomePage() {
  const on = useEntrance();

  return (
    <div className="space-y-0 -m-6">

      {/* ═══════════════════════════════════════ HERO ═══ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(120deg, ${VERDE_DARK} 0%, ${VERDE} 55%, #2c9452 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center min-h-[340px]">

          {/* Left — headline */}
          <div
            className="px-10 py-12 max-w-md shrink-0"
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "none" : "translateX(-28px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] mb-3"
              style={{ color: "rgba(170,255,200,0.85)" }}
            >
              Concrem · Tecnologia em Portas
            </p>
            <h1 className="text-5xl font-black text-white leading-[1.06] mb-5">
              Tecnologia<br />em portas.
            </h1>
            <p
              className="text-sm leading-relaxed mb-8"
              style={{ color: "rgba(210,255,225,0.88)" }}
            >
              Fabricamos portas e guarnições com precisão industrial,<br />
              materiais certificados FSC e processos 100% rastreáveis.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                className="px-6 py-2.5 text-sm font-bold rounded-lg transition-all hover:scale-[1.03] active:scale-95"
                style={{ background: "#fff", color: VERDE_DARK }}
              >
                Ver Produção
              </button>
              <button
                className="px-6 py-2.5 text-sm font-medium rounded-lg transition-all hover:bg-white/10"
                style={{ border: "1.5px solid rgba(255,255,255,0.32)", color: "#fff" }}
              >
                Rastreabilidade
              </button>
            </div>
          </div>

          {/* Right — door photo with callout labels */}
          <div
            className="relative flex-1 self-stretch min-h-[280px] md:min-h-0"
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "none" : "translateX(36px)",
              transition: "opacity 0.85s ease 0.18s, transform 0.85s ease 0.18s",
            }}
          >
            {/* Fade edge left */}
            <div
              className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
              style={{ background: `linear-gradient(to right, ${VERDE_DARK}, transparent)` }}
            />

            <img
              src="/images/porta-pivotante.jpg"
              alt="Porta Pivotante Bianco"
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ opacity: 0.72 }}
              draggable={false}
            />

            {/* Callout labels */}
            <PulseCallout label="Alizar Bianco"     style={{ top: "16%", left: "14%" }} delay={0}   />
            <PulseCallout label="Porta Pivotante"   style={{ top: "44%", right: "8%" }} delay={200} flip />
            <PulseCallout label="Batente Melamínico" style={{ bottom: "20%", left: "9%" }} delay={400} />
          </div>
        </div>

        {/* Decorative circles */}
        <div
          className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
        <div
          className="absolute -top-10 right-[38%] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.025)" }}
        />
      </section>

      {/* ══════════════════════════ DOOR KIT ANIMATION ══ */}
      <section
        style={{
          opacity: on ? 1 : 0,
          transition: "opacity 0.6s ease 0.35s",
        }}
      >
        <DoorKitAnimation />
      </section>

      {/* ════════════════════════════════════ FEATURES ══ */}
      <section
        className="px-8 py-8"
        style={{ background: "rgba(33,108,59,0.02)" }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-6"
          style={{
            color: VERDE,
            opacity: on ? 1 : 0,
            transition: "opacity 0.5s ease 0.6s",
          }}
        >
          Nossos Diferenciais
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              e: "🛡️",
              t: "Durabilidade",
              d: "Materiais certificados e processos rigorosos para produtos com longa vida útil.",
              delay: "0.65s",
            },
            {
              e: "🎯",
              t: "Precisão",
              d: "Tolerâncias dimensionais controladas em tempo real em cada máquina de produção.",
              delay: "0.76s",
            },
            {
              e: "🌿",
              t: "Sustentabilidade",
              d: "Madeira certificada FSC com rastreabilidade total da cadeia de fornecimento.",
              delay: "0.87s",
            },
            {
              e: "✅",
              t: "Qualidade",
              d: "Controle integrado em cada etapa: do recebimento de insumos à expedição.",
              delay: "0.98s",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border p-6 text-center hover:shadow-sm transition-shadow duration-300"
              style={{
                borderColor: "rgba(33,108,59,0.13)",
                background: "rgba(33,108,59,0.025)",
                opacity: on ? 1 : 0,
                transform: on ? "none" : "translateY(14px)",
                transition: `opacity 0.5s ease ${f.delay}, transform 0.5s ease ${f.delay}`,
              }}
            >
              <div className="text-3xl mb-3">{f.e}</div>
              <h4 className="font-bold text-foreground text-sm mb-2">{f.t}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════ COMPONENTS ══ */}
      <section className="px-8 py-6">
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-5"
          style={{
            color: VERDE,
            opacity: on ? 1 : 0,
            transition: "opacity 0.5s ease 0.75s",
          }}
        >
          Linha de Componentes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              src: "/images/batente-melaminico.jpg",
              alt: "Batente Melamínico Branco",
              tag: "Batente",
              title: "Batente Melamínico",
              desc: "Acabamento premium em melamina com núcleo em MDF certificado. Alta resistência e precisão dimensional garantida em cada peça fabricada.",
              delay: "0.8s",
            },
            {
              src: "/images/alizar-bianco.jpg",
              alt: "Alizar Bianco",
              tag: "Alizar",
              title: "Alizar Bianco",
              desc: "Perfil em U com acabamento Bianco fabricado com materiais de alta qualidade e certificação FSC — beleza e durabilidade em harmonia.",
              delay: "0.95s",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group flex items-center gap-6 rounded-2xl border bg-card p-6 hover:shadow-md transition-all duration-300 cursor-default"
              style={{
                borderColor: "rgba(33,108,59,0.14)",
                opacity: on ? 1 : 0,
                transform: on ? "none" : "translateY(20px)",
                transition: `opacity 0.6s ease ${item.delay}, transform 0.6s ease ${item.delay}, box-shadow 0.3s`,
              }}
            >
              <div
                className="w-36 h-28 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                style={{
                  background: "rgba(33,108,59,0.04)",
                  border: "1px solid rgba(33,108,59,0.1)",
                }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-contain group-hover:scale-[1.07] transition-transform duration-500"
                  draggable={false}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: VERDE }}
                >
                  {item.tag}
                </p>
                <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════ BOTTOM BANNER ══ */}
      <section className="px-8 pb-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            opacity: on ? 1 : 0,
            transition: "opacity 0.7s ease 1.05s",
            background: `linear-gradient(120deg, ${VERDE_DARK} 0%, ${VERDE} 100%)`,
          }}
        >
          <div className="px-10 py-9 flex items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-black text-white mb-1.5 leading-snug">
                Portas que unem design,<br />tecnologia e sustentabilidade.
              </h2>
              <p className="text-sm" style={{ color: "rgba(200,255,220,0.82)" }}>
                Gestão de produção integrada · Rastreabilidade · Material Certificado FSC
              </p>
            </div>
            <img
              src="/logo-concrem.png"
              alt="Concrem"
              className="h-12 object-contain shrink-0 opacity-90"
            />
          </div>
        </div>
      </section>

      {/* ── Keyframes ── */}
      <style>{`
        .callout-ring {
          animation: callout-ring 1.7s cubic-bezier(0,0,0.2,1) infinite;
        }
        @keyframes callout-ring {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
