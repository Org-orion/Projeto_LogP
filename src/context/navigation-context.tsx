"use client"

import { createContext, useContext, useState } from "react"

type NavState = {
  parent: string | null
  title: string
  section: string
  subSection?: string
}

type NavigationContextType = {
  active: NavState
  setActive: (state: NavState) => void
}

const DEFAULT: NavState = { parent: null, title: "Home", section: "home" }

const NavigationContext = createContext<NavigationContextType>({
  active: DEFAULT,
  setActive: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<NavState>(DEFAULT)

  return (
    <NavigationContext.Provider value={{ active, setActive }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
