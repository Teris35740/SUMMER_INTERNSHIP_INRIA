"use client";

import Link from "next/link";
import { Activity, Settings, BookOpen, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import { PaletteSelector } from "./palette-selector";
import type { Patient, GroupedPatients, AppStatus, AppMode } from "@/types/api";

interface NavbarProps {
  groupedPatients: GroupedPatients;
  patients: Patient[];
  currentPatientNum: number;
  currentPatient?: Patient;
  status: AppStatus;
  mode: AppMode | null;
  isPipelineOpen: boolean;
  onSelectPatient: (num: number) => void;
  onTogglePipeline: () => void;
  onChangeMode: () => void;
}

export function Navbar({
  groupedPatients,
  patients,
  currentPatientNum,
  currentPatient,
  status,
  mode,
  isPipelineOpen,
  onSelectPatient,
  onTogglePipeline,
  onChangeMode,
}: NavbarProps) {
  const difficultyConfig: Record<
    string,
    { className: string; label: string }
  > = {
    easy: { className: "bg-med-emerald-subtle text-med-emerald border-med-emerald/30", label: "Facile" },
    facile: { className: "bg-med-emerald-subtle text-med-emerald border-med-emerald/30", label: "Facile" },
    medium: { className: "bg-med-amber-subtle text-med-amber border-med-amber/30", label: "Moyen" },
    moyen: { className: "bg-med-amber-subtle text-med-amber border-med-amber/30", label: "Moyen" },
    hard: { className: "bg-med-rose-subtle text-med-rose border-med-rose/30", label: "Difficile" },
    difficile: { className: "bg-med-rose-subtle text-med-rose border-med-rose/30", label: "Difficile" },
  };

  const difficulty = (currentPatient?.difficulty || "").toLowerCase();
  const diffConfig = difficultyConfig[difficulty];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pb-2 pointer-events-none">
      <nav
        className="mx-auto flex items-center justify-between px-5 glass rounded-2xl pointer-events-auto"
        style={{ height: "64px", maxWidth: "1200px" }}
      >
        {/* ── Left: Logo ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-xl bg-gradient-logo text-white shadow-sm">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-gradient-brand font-extrabold text-[1.2rem] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              MedSim
            </span>
            <span className="text-[0.65rem] text-med-text-muted font-bold tracking-widest uppercase">
              Consultation
            </span>
          </div>
        </div>

        {/* ── Center: Patient Selector ── */}
        <div className="flex items-center">
          <div className="flex items-center gap-2.5 px-4 py-1.5 bg-med-bg-secondary/50 border border-med-border-subtle rounded-full text-sm shadow-inner">
            <span className="text-med-text-secondary font-medium whitespace-nowrap">
              Patient :
            </span>
            <select
              value={currentPatientNum}
              onChange={(e) => onSelectPatient(parseInt(e.target.value, 10))}
              className="bg-transparent border-none text-med-text-primary font-semibold text-sm cursor-pointer outline-none max-w-[280px]"
            >
              {Object.entries(groupedPatients).map(([specialty, group]) => (
                <optgroup
                  key={specialty}
                  label={specialty}
                >
                  {group.map((p) => (
                    <option
                      key={p.num}
                      value={p.num}
                      className="bg-med-bg-primary text-med-text-primary"
                    >
                      #{String(p.num).padStart(2, "0")} —{" "}
                      {p.chief_complaint || "Patient"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {currentPatient?.specialty && diffConfig && (
              <Badge
                variant="outline"
                className={`text-[0.7rem] font-bold uppercase tracking-widest px-2.5 py-0.5 border ${diffConfig.className}`}
              >
                {currentPatient.specialty}
              </Badge>
            )}
          </div>

          {/* New Patient button */}
          <Link href="/patients/nouveau">
            <Tooltip>
              <TooltipTrigger
                className="flex items-center justify-center w-[38px] h-[38px] rounded-full
                           bg-gradient-user-msg text-white shadow-md
                           hover:opacity-90 hover:shadow-lg
                           transition-all duration-150 cursor-pointer"
              >
                <UserPlus size={18} />
              </TooltipTrigger>
              <TooltipContent>Nouveau patient</TooltipContent>
            </Tooltip>
          </Link>
        </div>

        {/* ── Right: Mode, Status, Theme, Pipeline ── */}
        <div className="flex items-center gap-3">
          {/* Mode button */}
          <button
            onClick={onChangeMode}
            className="flex items-center gap-1.5 px-3 h-[38px] rounded-lg bg-med-bg-surface
                       border border-med-border-subtle text-med-text-secondary text-sm font-medium
                       hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default
                       transition-all duration-150 cursor-pointer shadow-sm"
          >
            <BookOpen size={16} />
            <span>
              {mode === "pedago"
                ? "Pédagogique"
                : mode === "notation"
                  ? "Notation"
                  : "Mode"}
            </span>
          </button>

          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-med-bg-surface border border-med-border-subtle shadow-sm rounded-full text-[0.8rem] text-med-text-secondary font-medium">
            <span
              className={`w-2 h-2 rounded-full animate-status-pulse ${
                status === "busy"
                  ? "bg-med-amber shadow-[0_0_8px_var(--color-med-amber)]"
                  : status === "error"
                    ? "bg-med-error shadow-[0_0_8px_var(--color-med-error)] animate-none"
                    : "bg-med-success shadow-[0_0_8px_var(--color-med-success)]"
              }`}
            />
            <span>
              {status === "busy"
                ? "Traitement..."
                : status === "error"
                  ? "Erreur"
                  : "Prêt"}
            </span>
          </div>

          <div className="w-px h-6 bg-med-border-default mx-1" />

          {/* Theme Toggle */}
          <ThemeToggle />
          <PaletteSelector />

          {/* Pipeline toggle */}
          <Tooltip>
            <TooltipTrigger
                onClick={onTogglePipeline}
                className={`flex items-center justify-center w-[38px] h-[38px] rounded-lg
                           border transition-all duration-150 cursor-pointer shadow-sm
                           ${
                             isPipelineOpen
                               ? "bg-med-sky-subtle text-med-sky border-med-sky/40"
                               : "bg-med-bg-surface text-med-text-secondary border-med-border-subtle hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default"
                           }`}
              >
                <Settings size={18} />
            </TooltipTrigger>
            <TooltipContent>Pipeline Internals</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </div>
  );
}

