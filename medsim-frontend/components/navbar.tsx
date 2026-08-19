"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Settings, BookOpen, Plus, UserPlus, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { PaletteSelector } from "./palette-selector";
import { DeletePatientDialog } from "./delete-patient-dialog";
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
  onDeletePatient: (num: number) => Promise<void>;
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
  onDeletePatient,
}: NavbarProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
    <>
    <div className="fixed top-0 left-0 right-0 z-[100] px-2 sm:px-4 pt-2 sm:pt-4 pb-2 pointer-events-none">
      <nav
        className="mx-auto flex items-center justify-between px-2.5 sm:px-5 glass rounded-xl sm:rounded-2xl pointer-events-auto h-[56px] sm:h-[64px] w-full max-w-[1200px]"
      >
        {/* ── Left: Logo ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-[34px] sm:w-[40px] h-[34px] sm:h-[40px] rounded-xl bg-gradient-logo text-white shadow-sm shrink-0">
            <Activity size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          </div>
          <div className="flex-col leading-tight hidden sm:flex">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-med-bg-surface/80 border border-med-border-default rounded-full text-sm shadow-sm backdrop-blur-md transition-all hover:bg-med-bg-surface hover:shadow hover:border-med-sky/30">
            <span className="text-med-text-secondary font-medium whitespace-nowrap hidden md:inline">
              Patient :
            </span>
            <select
              value={currentPatientNum}
              onChange={(e) => onSelectPatient(parseInt(e.target.value, 10))}
              className="bg-transparent border-none text-med-text-primary font-semibold text-xs sm:text-sm cursor-pointer outline-none max-w-[110px] sm:max-w-[280px] hover:text-med-sky transition-colors"
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
                className={`text-[0.6rem] sm:text-[0.7rem] font-bold uppercase tracking-widest px-1.5 sm:px-2.5 py-0.5 border ${diffConfig.className} hidden sm:inline-flex`}
              >
                {currentPatient.specialty}
              </Badge>
            )}
          </div>

          {/* Patient management menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center justify-center w-[34px] sm:w-[38px] h-[34px] sm:h-[38px] rounded-full
                         bg-gradient-user-msg text-white shadow-md
                         hover:opacity-100 hover:shadow-lg hover:scale-105 active:scale-95
                         transition-all duration-200 cursor-pointer border border-white/10"
            >
              <Plus size={18} className="sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 bg-med-bg-elevated border-med-border-strong p-1.5 rounded-xl shadow-xl">
              <DropdownMenuItem
                onClick={() => router.push("/patients/nouveau")}
                className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-bg-surface-hover rounded-lg transition-colors p-2"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-sky-subtle">
                  <UserPlus className="h-4 w-4 text-med-sky" />
                </div>
                <span className="font-medium">Ajouter un patient</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-rose-subtle/40 rounded-lg transition-colors p-2"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-rose-subtle/50">
                  <Trash2 className="h-4 w-4 text-med-rose" />
                </div>
                <span className="font-medium">Supprimer un patient</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled
                className="gap-3 cursor-not-allowed opacity-50 p-2"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-bg-secondary">
                  <FileText className="h-4 w-4 text-med-text-muted" />
                </div>
                <span className="font-medium">Ajouter un document</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Right: Mode, Status, Theme, Pipeline ── */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mode button */}
          <button
            onClick={onChangeMode}
            className="flex items-center justify-center sm:justify-start gap-1.5 w-[34px] sm:w-auto px-0 sm:px-3 h-[34px] sm:h-[38px] rounded-lg sm:rounded-lg bg-med-bg-surface
                       border border-med-border-subtle text-med-text-secondary text-sm font-medium
                       hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default
                       transition-all duration-150 cursor-pointer shadow-sm"
          >
            <BookOpen size={16} />
            <span className="hidden md:inline">
              {mode === "pedago"
                ? "Pédagogique"
                : mode === "notation"
                  ? "Notation"
                  : "Mode"}
            </span>
          </button>

          {/* Status indicator */}
          <div className="flex items-center justify-center sm:justify-start gap-2 w-[34px] sm:w-auto h-[34px] sm:h-[38px] px-0 sm:px-3.5 bg-med-bg-surface border border-med-border-subtle shadow-sm rounded-lg sm:rounded-full text-[0.8rem] text-med-text-secondary font-medium">
            <span
              className={`w-2 h-2 rounded-full animate-status-pulse shrink-0 ${
                status === "busy"
                  ? "bg-med-amber shadow-[0_0_8px_var(--color-med-amber)]"
                  : status === "error"
                    ? "bg-med-error shadow-[0_0_8px_var(--color-med-error)] animate-none"
                    : "bg-med-success shadow-[0_0_8px_var(--color-med-success)]"
              }`}
            />
            <span className="hidden md:inline">
              {status === "busy"
                ? "Traitement..."
                : status === "error"
                  ? "Erreur"
                  : "Prêt"}
            </span>
          </div>

          <div className="w-px h-6 bg-med-border-default mx-0.5 sm:mx-1" />

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="hidden sm:block">
            <PaletteSelector />
          </div>

          {/* Pipeline toggle */}
          <Tooltip>
            <TooltipTrigger
                onClick={onTogglePipeline}
                className={`flex items-center justify-center w-[34px] sm:w-[38px] h-[34px] sm:h-[38px] rounded-lg
                           border transition-all duration-150 cursor-pointer shadow-sm
                           ${
                             isPipelineOpen
                               ? "bg-med-sky-subtle text-med-sky border-med-sky/40"
                               : "bg-med-bg-surface text-med-text-secondary border-med-border-subtle hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default"
                           }`}
              >
                <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
            </TooltipTrigger>
            <TooltipContent>Pipeline Internals</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </div>

    {/* Delete patient dialog */}
    <DeletePatientDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      patients={patients}
      onDelete={onDeletePatient}
    />
    </>
  );
}

