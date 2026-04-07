"use client";

import { useState } from "react";
import Login from "@/views/Login";
import Dashboard from "@/views/Dashboard";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />;
}
