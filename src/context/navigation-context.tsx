"use client"

import { createContext, useContext, useState } from "react"
import { NAV_META, QUALIDADE_SUB_TITLES } from "@/lib/nav-items"

type NavState = {
  parent: string | null
  title: string
  section: string
  subSection?: string
}

type NavigationContextType = {
  active: NavState
  setSection: (section: string, subSection?: string) => void
}

const DEFAULT: NavState = { parent: null, title: "Home", section: "home" }

function buildState(section: string, subSection?: string): NavState {
  const meta = NAV_META[section] ?? DEFAULT
  const title = section === "qualidade"
    ? QUALIDADE_SUB_TITLES[subSection ?? "gramatura"]
    : meta.title
  return { parent: meta.parent, title, section, subSection }
}

const NavigationContext = createContext<NavigationContextType>({
  active: DEFAULT,
  setSection: () => {},
})

export function NavigationProvider({
  initialSection = "home",
  children,
}: {
  initialSection?: string
  children: React.ReactNode
}) {
  const [active, setActive] = useState<NavState>(() => buildState(initialSection))

  function setSection(section: string, subSection?: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("logp_section", section)
    }
    setActive(buildState(section, subSection))
  }

  return (
    <NavigationContext.Provider value={{ active, setSection }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
