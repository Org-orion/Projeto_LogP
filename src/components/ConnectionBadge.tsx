"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionBadgeProps {
  /** "onDark": pra uso sobre o verde institucional (barra de abas) — "default" assume fundo neutro (card/branco). */
  variant?: "default" | "onDark";
}

const ConnectionBadge = ({ variant = "default" }: ConnectionBadgeProps) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const onDark = variant === "onDark";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        onDark
          ? isOnline
            ? "bg-white/15 text-sidebar-foreground"
            : "bg-warning/25 text-sidebar-foreground animate-pulse-slow"
          : isOnline
            ? "bg-success/15 text-success"
            : "bg-warning/15 text-warning animate-pulse-slow"
      }`}
    >
      {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {isOnline ? "Online" : "Offline"}
    </div>
  );
};

export default ConnectionBadge;
