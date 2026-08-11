"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      themes={["light", "dark", "naturel-chic", "tech-moderne", "ethique-vegetal", "premium-sombre", "doux-creatif"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
