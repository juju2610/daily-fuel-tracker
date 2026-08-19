"use client";

import { useEffect, useState } from "react";

export function useTheme(){
  const [theme, setTheme] = useState("cute");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("fuelTrackerTheme") : null;
    if(saved === "cute" || saved === "pro") setTheme(saved);
  }, []);

  function toggleTheme(){
    setTheme(prev => {
      const next = prev === "cute" ? "pro" : "cute";
      if(typeof window !== "undefined") window.localStorage.setItem("fuelTrackerTheme", next);
      return next;
    });
  }

  return { theme, toggleTheme };
}
