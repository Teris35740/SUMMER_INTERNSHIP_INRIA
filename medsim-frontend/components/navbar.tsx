"use client";

import { Activity, Settings, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Patient, AppStatus, AppMode } from "@/types/api";

interface NavbarProps {
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
    <nav
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6
                   bg-med-bg-primary/75 backdrop-blur-xl border-b border-med-border-subtle"
      style={{ height: "var(--navbar-height)" }}
    >
      {/* ── Left: Logo ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-[38px] h-[38px] rounded-lg bg-gradient-logo text-med-text-inverse">
          <Activity size={20} />
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className="text-gradient-brand font-bold text-[1.15rem] tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MedSim
          </span>
          <span className="text-[0.7rem] text-med-text-muted font-normal tracking-widest uppercase">
            Consultation Virtuelle
          </span>
        </div>
      </div>

      {/* ── Center: Patient Selector ── */}
      <div className="flex items-center">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-med-bg-surface border border-med-border-default rounded-full text-sm">
          <span className="text-med-text-secondary font-medium whitespace-nowrap">
            Patient :
          </span>
          <select
            value={currentPatientNum}
            onChange={(e) => onSelectPatient(parseInt(e.target.value, 10))}
            className="bg-transparent border-none text-med-text-primary font-medium text-sm cursor-pointer outline-none max-w-[280px]"
          >
            {patients.map((p) => (
              <option
                key={p.num}
                value={p.num}
                className="bg-med-bg-secondary text-med-text-primary"
              >
                #{String(p.num).padStart(2, "0")} —{" "}
                {p.chief_complaint || "Patient"}
              </option>
            ))}
          </select>
          {currentPatient?.specialty && diffConfig && (
            <Badge
              variant="outline"
              className={`text-[0.72rem] font-semibold uppercase tracking-wider px-2.5 py-0.5 border ${diffConfig.className}`}
            >
              {currentPatient.specialty}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Right: Mode, Status, Pipeline toggle ── */}
      <div className="flex items-center gap-3">
        {/* Mode button */}
        <button
          onClick={onChangeMode}
          className="flex items-center gap-1.5 px-3 h-[38px] rounded-lg bg-med-bg-surface
                     border border-med-border-subtle text-med-text-secondary text-sm font-medium
                     hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default
                     transition-all duration-150 cursor-pointer"
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
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-med-bg-surface border border-med-border-subtle rounded-full text-[0.8rem] text-med-text-secondary">
          <span
            className={`w-2 h-2 rounded-full animate-status-pulse ${
              status === "busy"
                ? "bg-med-amber shadow-[0_0_6px_var(--color-med-amber)]"
                : status === "error"
                  ? "bg-med-error shadow-[0_0_6px_var(--color-med-error)] animate-none"
                  : "bg-med-success shadow-[0_0_6px_var(--color-med-success)]"
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

        {/* Pipeline toggle */}
        <Tooltip>
          <TooltipTrigger
              onClick={onTogglePipeline}
              className={`flex items-center justify-center w-[38px] h-[38px] rounded-lg
                         border transition-all duration-150 cursor-pointer
                         ${
                           isPipelineOpen
                             ? "bg-med-sky-subtle text-med-sky border-med-sky/30"
                             : "bg-med-bg-surface text-med-text-secondary border-med-border-subtle hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default"
                         }`}
            >
              <Settings size={20} />
          </TooltipTrigger>
          <TooltipContent>Pipeline Internals</TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
