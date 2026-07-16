"use client";

import { motion, type MotionValue } from "framer-motion";
import { Factory, ShieldCheck, BadgeCheck, Lock } from "lucide-react";

interface LoginHeroProps {
  x: MotionValue<number> | number;
  y: MotionValue<number> | number;
}

const CHIPS = [
  { icon: Factory,     label: "Produção" },
  { icon: ShieldCheck, label: "Qualidade" },
  { icon: BadgeCheck,  label: "Certificações" },
  { icon: Lock,        label: "Segurança" },
];

// Área editorial da tela de login — puramente institucional, não depende de
// nenhuma imagem de fundo específica para fazer sentido sozinha.
export function LoginHero({ x, y }: LoginHeroProps) {
  return (
    <motion.div className="login-hero" style={{ x, y, willChange: "transform" }}>
      <div className="login-hero-logo-badge">
        <img src="/Logo-Branco.png" alt="Concrem" style={{ height: 44, width: "auto", display: "block" }} />
      </div>

      <h1 className="login-hero-headline">
        Bem-vindo ao sistema de gestão da Concrem
      </h1>
      <p className="login-hero-sub">
        Acompanhe produção, qualidade e certificações com segurança e
        eficiência em um único lugar.
      </p>

      <div className="login-hero-chips">
        {CHIPS.map(({ icon: Icon, label }) => (
          <span key={label} className="login-hero-chip">
            <Icon size={13} /> {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
