"use client";

import { useState } from "react";
import Login from "@/views/Login";
import Dashboard from "@/views/Dashboard";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("logp_logged_in") === "true"
  );

  const handleLogin = () => {
    localStorage.setItem("logp_logged_in", "true");
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("logp_logged_in");
    localStorage.removeItem("logp_section");
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
