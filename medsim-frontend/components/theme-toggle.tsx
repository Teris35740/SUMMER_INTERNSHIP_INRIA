"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-[38px] h-[38px] rounded-lg bg-med-bg-surface border-med-border-subtle opacity-50">
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-[38px] h-[38px] rounded-lg bg-med-bg-surface border-med-border-subtle text-med-text-secondary hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default transition-all duration-150 cursor-pointer"
    >
      {theme === "light" ? (
        <Sun size={18} className="text-med-amber" />
      ) : (
        <Moon size={18} className="text-med-sky" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
