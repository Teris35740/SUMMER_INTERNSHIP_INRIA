"use client";

import { BookOpen, Activity } from "lucide-react";
import type { AppMode } from "@/types/api";

interface ModeSelectionProps {
  onSelectMode: (mode: AppMode) => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-med-bg-primary/80 backdrop-blur-2xl animate-fade-in">
      <div className="text-center max-w-2xl px-6 w-full">
        <h1
          className="text-4xl md:text-5xl font-black mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="text-gradient-brand">MedSim</span>
        </h1>
        <p className="text-med-text-secondary text-lg mb-12 font-medium">
          Sélectionnez le mode de la consultation virtuelle
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mode Pédagogique */}
          <button
            type="button"
            onClick={() => onSelectMode("pedago")}
            className="group relative flex flex-col items-start gap-5 p-8 rounded-3xl
                       glass-panel hover:bg-med-bg-surface-hover hover:-translate-y-1
                       transition-all duration-300 text-left cursor-pointer
                       animate-card-scale-in border border-med-border-default hover:border-med-sky/50 hover:shadow-glow"
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl
                           bg-med-sky-subtle text-med-sky shadow-inner
                           group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
            >
              <BookOpen size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-med-text-primary mb-2 tracking-tight">
                Pédagogique
              </h3>
              <p className="text-sm text-med-text-secondary leading-relaxed font-medium">
                Posez vos questions librement. L&apos;assistant fournira des
                retours sur votre méthodologie et des rappels théoriques, sans
                notation finale.
              </p>
            </div>
          </button>

          {/* Mode Notation */}
          <button
            type="button"
            onClick={() => onSelectMode("notation")}
            className="group relative flex flex-col items-start gap-5 p-8 rounded-3xl
                       glass-panel hover:bg-med-bg-surface-hover hover:-translate-y-1
                       transition-all duration-300 text-left cursor-pointer
                       animate-card-scale-in border border-med-border-default hover:border-med-violet/50 hover:shadow-glow"
            style={{ animationDelay: "100ms" }}
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl
                           bg-med-violet-subtle text-med-violet shadow-inner
                           group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
            >
              <Activity size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-med-text-primary mb-2 tracking-tight">
                Notation
              </h3>
              <p className="text-sm text-med-text-secondary leading-relaxed font-medium">
                Mode examen standard. Pas d&apos;aide en cours de route. Un
                rapport de compétences détaillé vous sera remis après votre
                diagnostic.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
