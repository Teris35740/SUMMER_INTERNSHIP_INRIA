"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const palettes = [
  { id: "light", name: "Défaut Clair", type: "system" },
  { id: "dark", name: "Défaut Sombre", type: "system" },
  { id: "naturel-chic", name: "Naturel chic", type: "custom", colors: ["#2D2A26", "#C8813A", "#D4C5B0", "#F5EFE6"] },
  { id: "tech-moderne", name: "Tech moderne", type: "custom", colors: ["#6366F1", "#F59E0B", "#E0E7FF", "#F9FAFB"] },
  { id: "ethique-vegetal", name: "Éthique et végétal", type: "custom", colors: ["#1B4332", "#F4A261", "#D8F3DC", "#F9FBE7"] },
  { id: "premium-sombre", name: "Premium sombre", type: "custom", colors: ["#E2C87E", "#F5F5F5", "#1F1F1F", "#0D0D0D"] },
  { id: "doux-creatif", name: "Doux et créatif", type: "custom", colors: ["#1E293B", "#A78BFA", "#BDE0FE", "#FFC4A3"] },
];

export function PaletteSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-[38px] h-[38px] rounded-lg bg-med-bg-surface border-med-border-subtle opacity-50">
        <Palette size={18} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center w-[38px] h-[38px] rounded-lg bg-med-bg-surface border border-med-border-subtle text-med-text-secondary hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default transition-all duration-150 cursor-pointer shadow-sm outline-none focus:ring-2 focus:ring-med-ring"
      >
        <Palette size={18} />
        <span className="sr-only">Changer la palette</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-panel border-med-border-default">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-med-text-primary text-xs uppercase tracking-wider">
            Palettes
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-med-border-subtle" />
          {palettes.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setTheme(p.id)}
              className="flex items-center justify-between cursor-pointer hover:bg-med-bg-surface-hover focus:bg-med-bg-surface-hover text-med-text-primary"
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-sm">{p.name}</span>
                {p.type === "custom" && p.colors && (
                  <div className="flex gap-1">
                    {p.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-med-border-strong"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {theme === p.id && <Check size={16} className="text-med-sky" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
