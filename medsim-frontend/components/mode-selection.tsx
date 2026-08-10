"use client";

import { BookOpen, Activity } from "lucide-react";
import type { AppMode } from "@/types/api";

interface ModeSelectionProps {
  onSelectMode: (mode: AppMode) => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-med-bg-primary/80 backdrop-blur-xl animate-fade-in">
      <div className="text-center max-w-2xl px-6">
        <h1
          className="text-4xl font-bold mb-3 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="text-gradient-brand">Bienvenue sur MedSim</span>
        </h1>
        <p className="text-med-text-secondary text-lg mb-10">
          Sélectionnez le mode de la consultation virtuelle
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Mode Pédagogique */}
          <button
            type="button"
            onClick={() => onSelectMode("pedago")}
            className="group relative flex flex-col items-start gap-4 p-6 rounded-xl
                       bg-med-bg-surface border border-med-border-default
                       hover:border-med-sky/40 hover:bg-med-bg-surface-hover
                       transition-all duration-300 text-left cursor-pointer
                       animate-card-scale-in"
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg
                           bg-med-sky-subtle text-med-sky
                           group-hover:scale-110 transition-transform duration-300"
            >
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-med-text-primary mb-1.5">
                Mode Pédagogique
              </h3>
              <p className="text-sm text-med-text-secondary leading-relaxed">
                Posez vos questions librement. L&apos;assistant fournira des
                retours sur votre méthodologie et des rappels théoriques, sans
                aucune notation finale.
              </p>
            </div>
          </button>

          {/* Mode Notation */}
          <button
            type="button"
            onClick={() => onSelectMode("notation")}
            className="group relative flex flex-col items-start gap-4 p-6 rounded-xl
                       bg-med-bg-surface border border-med-border-default
                       hover:border-med-violet/40 hover:bg-med-bg-surface-hover
                       transition-all duration-300 text-left cursor-pointer
                       animate-card-scale-in"
            style={{ animationDelay: "100ms" }}
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg
                           bg-med-violet-subtle text-med-violet
                           group-hover:scale-110 transition-transform duration-300"
            >
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-med-text-primary mb-1.5">
                Mode Notation
              </h3>
              <p className="text-sm text-med-text-secondary leading-relaxed">
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
