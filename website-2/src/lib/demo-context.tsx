"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface DemoModeContextType {
  isDemo: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemo: false,
  toggle: () => {},
  enable: () => {},
  disable: () => {},
});

export function useDemoMode() {
  return useContext(DemoModeContext);
}

/**
 * DemoModeProvider
 * - `forced={true}` → always demo mode (for /demo routes)
 * - `forced={false}` → always real mode (for /dashboard routes)
 * - `forced` omitted → uses localStorage toggle
 */
export function DemoModeProvider({
  children,
  forced,
}: {
  children: React.ReactNode;
  forced?: boolean;
}) {
  const [isDemo, setIsDemo] = useState(() => {
    if (forced !== undefined) return forced;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oakwell_demo_mode");
      return stored !== "false";
    }
    return true;
  });

  // Sync with forced prop if it changes
  useEffect(() => {
    if (forced !== undefined) setIsDemo(forced);
  }, [forced]);

  const toggle = useCallback(() => {
    if (forced !== undefined) return; // can't toggle when forced
    setIsDemo((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("oakwell_demo_mode", String(next));
      }
      return next;
    });
  }, [forced]);

  const enable = useCallback(() => {
    if (forced !== undefined) return;
    setIsDemo(true);
    if (typeof window !== "undefined") localStorage.setItem("oakwell_demo_mode", "true");
  }, [forced]);

  const disable = useCallback(() => {
    if (forced !== undefined) return;
    setIsDemo(false);
    if (typeof window !== "undefined") localStorage.setItem("oakwell_demo_mode", "false");
  }, [forced]);

  return (
    <DemoModeContext.Provider value={{ isDemo, toggle, enable, disable }}>
      {children}
    </DemoModeContext.Provider>
  );
}
