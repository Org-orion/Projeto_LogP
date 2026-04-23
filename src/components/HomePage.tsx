"use client";

import { useEffect, useState } from "react";

const VERDE = "#216C3B";
const VERDE_DARK = "#194f2c";

function useEntrance() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    return () => clearTimeout(t);
  }, []);
  return on;
}

function PulseCallout({
  label,
  style,
  delay = 0,
  align = "right",
}: {
  label: string;
  style: React.CSSProperties;
  delay?: number;
  align?: "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 700 + delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="absolute flex items-center gap-2"
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        flexDirection: align === "left" ? "row" : "row-reverse",
      }}
    >
      <div className="relative flex items-center justify-center">
        <span className="callout-ping absolute inline-flex h-4 w-4 rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </div>
      <div
        className="text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap"
        style={{ background: "rgba(255,255,255,0.92)", color: VERDE_DARK, backdropFilter: "blur(4px)" }}
      >
        {label}
      </div>
    </div>
  );
}

export default function HomePage() {
  const on = useEntrance();

  return (
    <div className="space-y-5 -m-6">

      {/* ──────────── HERO ──────────── */}
      <section
        className="relative overflow-hidden min-h-[460px] flex items-stretch"
        style={{ background: `linear-gradient(125deg, ${VERDE_DARK} 0%, ${VERDE} 55%, #2d9655 100%)` }}
      >
        {/* Left — copy */}
        <div
          className="relative z-10 flex flex-col justify-center px-10 py-14 max-w-lg"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? "translateX(0)" : "translateX(-32px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(180,255,200,0.85)" }}>
            Concrem · Tecnologia em Portas
          </p>
          <h1 className="text-5xl font-black text-white leading-[1.08] mb-5">
            Tecnologia<br />em portas.
          </h1>
          <p className="text-base leading-relaxed mb-8" style={{ color: "rgba(210,255,225,0.9)" }}>
            Fabricamos portas e guarnições com precisão<br />
            industrial, materiais certificados FSC e processos<br />
            100% rastreáveis do início ao fim.
          </p>
          <div className="flex gap-3">
            <button
              className="px-6 py-2.5 text-sm font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "#fff", color: VERDE_DARK }}
            >
              Ver Produção
            </button>
            <button
              className="px-6 py-2.5 text-sm font-medium rounded-lg transition-all hover:bg-white/10"
              style={{ border: "1.5px solid rgba(255,255,255,0.35)", color: "#fff" }}
            >
              Rastreabilidade
            </button>
          </div>
        </div>

        {/* Right — hero image + callouts */}
        <div
          className="absolute right-0 top-0 bottom-0"
          style={{
            width: "58%",
            opacity: on ? 1 : 0,
            transform: on ? "translateX(0)" : "translateX(48px)",
            transition: "opacity 0.85s ease 0.15s, transform 0.85s ease 0.15s",
          }}
        >
          {/* Fade edge on the left */}
          <div
            className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${VERDE_DARK}, transparent)` }}
          />

          <img
            src="/images/porta-pivotante.jpg"
            alt="Porta Pivotante Bianco"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ opacity: 0.75 }}
          />

          {/* Callouts */}
          <PulseCallout label="Alizar Bianco"       style={{ top: "18%", left: "12%" }} delay={0}   align="right" />
          <PulseCallout label="Porta Pivotante"      style={{ top: "42%", right: "10%" }} delay={200} align="left"  />
          <PulseCallout label="Batente Melamínico"   style={{ bottom: "22%", left: "8%" }} delay={400} align="right" />
        </div>

        {/* Decorative circles */}
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="absolute -top-16 right-[40%] w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      </section>

      {/* ──────────── COMPONENTES ──────────── */}
      <section className="px-8">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{
            color: VERDE,
            opacity: on ? 1 : 0,
            transition: "opacity 0.5s ease 0.5s",
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
              desc: "Acabamento premium em melamina com núcleo em MDF certificado. Alta resistência e precisão dimensional garantida em cada peça.",
              delay: "0.55s",
            },
            {
              src: "/images/alizar-bianco.jpg",
              alt: "Alizar Bianco",
              tag: "Alizar",
              title: "Alizar Bianco",
              desc: "Perfil em U com acabamento Bianco fabricado com materiais de alta qualidade e certificação FSC — beleza e durabilidade integradas.",
              delay: "0.7s",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group flex items-center gap-6 rounded-2xl border bg-card p-6 hover:shadow-md transition-all duration-300 cursor-default"
              style={{
                borderColor: "rgba(33,108,59,0.14)",
                opacity: on ? 1 : 0,
                transform: on ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.6s ease ${item.delay}, transform 0.6s ease ${item.delay}, box-shadow 0.3s`,
              }}
            >
              <div
                className="w-36 h-28 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(33,108,59,0.04)", border: "1px solid rgba(33,108,59,0.1)" }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-contain group-hover:scale-[1.06] transition-transform duration-500"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: VERDE }}>
                  {item.tag}
                </p>
                <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────── FEATURES ──────────── */}
      <section className="px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              emoji: "🛡️",
              title: "Durabilidade",
              desc: "Materiais certificados e processos controlados que garantem produtos de longa vida útil.",
              delay: "0.65s",
            },
            {
              emoji: "🎯",
              title: "Precisão",
              desc: "Tolerâncias dimensionais rigorosas monitoradas em tempo real em cada máquina.",
              delay: "0.75s",
            },
            {
              emoji: "🌿",
              title: "Sustentabilidade",
              desc: "Madeira de origem certificada FSC com rastreabilidade total na cadeia produtiva.",
              delay: "0.85s",
            },
            {
              emoji: "✅",
              title: "Qualidade",
              desc: "Controle integrado em cada etapa do processo, do recebimento à expedição.",
              delay: "0.95s",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border p-6 text-center hover:shadow-sm transition-all duration-300"
              style={{
                borderColor: "rgba(33,108,59,0.12)",
                background: "rgba(33,108,59,0.025)",
                opacity: on ? 1 : 0,
                transform: on ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.5s ease ${f.delay}, transform 0.5s ease ${f.delay}`,
              }}
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h4 className="font-bold text-foreground mb-2 text-sm">{f.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────── BOTTOM BANNER ──────────── */}
      <section
        className="mx-8 rounded-2xl overflow-hidden"
        style={{
          opacity: on ? 1 : 0,
          transition: "opacity 0.7s ease 1.05s",
          background: `linear-gradient(125deg, ${VERDE_DARK} 0%, ${VERDE} 100%)`,
        }}
      >
        <div className="px-10 py-9 flex items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-white mb-1.5 leading-snug">
              Portas que unem design,<br />tecnologia e sustentabilidade.
            </h2>
            <p className="text-sm" style={{ color: "rgba(200,255,220,0.85)" }}>
              Gestão de produção integrada · Rastreabilidade · Material Certificado FSC
            </p>
          </div>
          <img
            src="/logo-concrem.png"
            alt="Concrem"
            className="h-12 object-contain flex-shrink-0 opacity-90"
          />
        </div>
      </section>

      <div className="pb-6" />

      <style>{`
        .callout-ping {
          animation: callout-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes callout-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
