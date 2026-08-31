"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Plus,
  UserPlus,
  Trash2,
  FileText,
  LogIn,
  LogOut,
  GraduationCap,
  School,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { PaletteSelector } from "./palette-selector";
import { DeletePatientDialog } from "./delete-patient-dialog";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { uploadPatientDocument } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import type { Patient, GroupedPatients, AppMode } from "@/types/api";

interface NavbarProps {
  groupedPatients: GroupedPatients;
  patients: Patient[];
  currentPatientNum: number;
  currentPatient?: Patient;
  mode: AppMode | null;
  onSelectPatient: (num: number) => void;
  onChangeMode: () => void;
  onDeletePatient: (num: number) => Promise<void>;
}

export function Navbar({
  groupedPatients,
  patients,
  currentPatientNum,
  currentPatient,
  mode,
  onSelectPatient,
  onChangeMode,
  onDeletePatient,
}: NavbarProps) {
  const router = useRouter();
  const { user, isProfessor, logout, openAuthModal } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDocumentDialogOpen, setDeleteDocumentDialogOpen] = useState(false);

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

  const handleUploadDocument = async (file: File) => {
    try {
      await uploadPatientDocument(file);
      toast.success("Document uploadé et ingéré avec succès !");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Échec de l'upload : ${message}`);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100] px-3 sm:px-6 pt-3 sm:pt-4 pb-2 pointer-events-none">
        <nav
          className="mx-auto flex items-center justify-between px-3.5 sm:px-6 glass-panel rounded-2xl pointer-events-auto h-[58px] sm:h-[64px] w-full max-w-[1200px] border border-med-border-default shadow-xl shadow-black/5"
        >
          {/* ── Left: Logo ── */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center justify-center w-[36px] sm:w-[40px] h-[36px] sm:h-[40px] rounded-xl bg-gradient-logo text-white shadow-md shadow-med-sky/20 shrink-0">
              <Activity size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
            <div className="flex-col leading-none hidden sm:flex">
              <span
                className="text-gradient-brand font-extrabold text-[1.25rem] tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                MedSim
              </span>
              <span className="text-[0.62rem] text-med-text-muted font-bold tracking-widest uppercase mt-0.5">
                Consultation
              </span>
            </div>
          </div>

          {/* ── Center: Patient Selector & Actions ── */}
          <div className="flex items-center gap-2 sm:gap-2.5 max-w-[50%] sm:max-w-none">
            <div className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-med-bg-surface/90 border border-med-border-default rounded-full text-sm shadow-sm backdrop-blur-md transition-all hover:border-med-sky/40 hover:shadow">
              <span className="text-med-text-secondary font-medium text-xs whitespace-nowrap hidden lg:inline">
                Patient :
              </span>
              <div className="relative flex items-center">
                <select
                  value={currentPatientNum}
                  onChange={(e) => onSelectPatient(parseInt(e.target.value, 10))}
                  className="bg-transparent border-none text-med-text-primary font-semibold text-xs sm:text-sm cursor-pointer outline-none max-w-[120px] sm:max-w-[260px] md:max-w-[320px] truncate hover:text-med-sky transition-colors pr-4 appearance-none"
                >
                  {Object.entries(groupedPatients).map(([specialty, group]) => (
                    <optgroup key={specialty} label={specialty}>
                      {group.map((p) => (
                        <option
                          key={p.num}
                          value={p.num}
                          className="bg-med-bg-primary text-med-text-primary"
                        >
                          #{String(p.num).padStart(2, "0")} — {p.chief_complaint || "Patient"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-med-text-muted pointer-events-none absolute right-0" />
              </div>
              {currentPatient?.specialty && (
                <Badge
                  variant="outline"
                  className={`text-[0.62rem] sm:text-[0.68rem] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    diffConfig ? diffConfig.className : "bg-med-sky-subtle text-med-sky border-med-sky/30"
                  } hidden md:inline-flex shrink-0`}
                >
                  {currentPatient.specialty}
                </Badge>
              )}
            </div>

            {/* Patient & Document Management Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center justify-center w-[34px] sm:w-[38px] h-[34px] sm:h-[38px] rounded-full
                           bg-gradient-user-msg text-white shadow-md
                           hover:opacity-95 hover:scale-105 active:scale-95
                           transition-all duration-200 cursor-pointer border border-white/10 shrink-0"
              >
                <Plus size={18} strokeWidth={2.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-med-bg-elevated border-med-border-strong p-1.5 rounded-xl shadow-xl">
                <DropdownMenuItem
                  onClick={() => router.push("/patients/nouveau")}
                  className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-bg-surface-hover rounded-lg transition-colors p-2 text-xs font-medium"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-sky-subtle">
                    <UserPlus className="h-4 w-4 text-med-sky" />
                  </div>
                  <span>Ajouter un patient</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-rose-subtle/40 rounded-lg transition-colors p-2 text-xs font-medium"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-rose-subtle/50">
                    <Trash2 className="h-4 w-4 text-med-rose" />
                  </div>
                  <span>Supprimer un patient</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDocumentDialogOpen(true)}
                  className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-rose-subtle/40 rounded-lg transition-colors p-2 text-xs font-medium"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-rose-subtle/50">
                    <Trash2 className="h-4 w-4 text-med-rose" />
                  </div>
                  <span>Supprimer un document</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setUploadDialogOpen(true)}
                  className="gap-3 cursor-pointer text-med-text-primary hover:bg-med-sky-subtle/40 rounded-lg transition-colors p-2 text-xs font-medium"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-med-sky-subtle/50">
                    <FileText className="h-4 w-4 text-med-sky" />
                  </div>
                  <span>Ajouter un document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Right: Mode, Theme, User Profile ── */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mode Switcher Button */}
            <button
              type="button"
              onClick={onChangeMode}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 h-[34px] sm:h-[38px] rounded-xl bg-med-bg-surface
                         border border-med-border-subtle text-med-text-secondary text-xs sm:text-sm font-semibold
                         hover:bg-med-bg-surface-hover hover:text-med-text-primary hover:border-med-border-default
                         transition-all duration-150 cursor-pointer shadow-sm"
            >
              <BookOpen size={15} className="text-med-sky" />
              <span className="hidden sm:inline">
                {mode === "pedago"
                  ? "Pédagogique"
                  : mode === "notation"
                    ? "Notation"
                    : "Mode"}
              </span>
            </button>

            <div className="w-px h-5 bg-med-border-default mx-0.5" />

            {/* Theme & Palette Controls */}
            <div className="hidden sm:flex items-center gap-1">
              <ThemeToggle />
              <PaletteSelector />
            </div>

            <div className="w-px h-5 bg-med-border-default mx-0.5 hidden sm:block" />

            {/* User Profile / Auth Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 h-[34px] sm:h-[38px] px-2 sm:px-3 rounded-xl bg-med-bg-surface
                             border border-med-border-subtle hover:bg-med-bg-surface-hover hover:border-med-border-default
                             transition-all duration-150 cursor-pointer shadow-sm outline-none"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-logo text-white flex items-center justify-center text-[0.7rem] font-bold shrink-0 shadow-sm">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-xs font-semibold text-med-text-primary hidden md:inline truncate max-w-[120px]">
                    {user.full_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[0.6rem] font-bold px-1.5 py-0 hidden lg:inline-flex ${
                      isProfessor
                        ? "bg-med-emerald-subtle text-med-emerald border-med-emerald/30"
                        : "bg-med-sky-subtle text-med-sky border-med-sky/30"
                    }`}
                  >
                    {isProfessor ? "Prof" : "Étudiant"}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-med-bg-elevated border-med-border-strong p-1.5 rounded-xl shadow-xl">
                  <div className="px-2.5 py-2 mb-1 border-b border-med-border-subtle">
                    <p className="text-xs font-bold text-med-text-primary truncate">{user.full_name}</p>
                    <p className="text-[0.68rem] text-med-text-muted truncate">{user.email}</p>
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-md ${
                          isProfessor
                            ? "bg-med-emerald-subtle text-med-emerald"
                            : "bg-med-sky-subtle text-med-sky"
                        }`}
                      >
                        {isProfessor ? <School className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                        {isProfessor ? "Professeur" : "Étudiant"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuItem
                    onClick={logout}
                    className="gap-2.5 cursor-pointer text-med-rose hover:bg-med-rose-subtle/50 rounded-lg transition-colors p-2 text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4 text-med-rose" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3.5 h-[34px] sm:h-[38px] rounded-xl bg-gradient-user-msg text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-white/10"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Dialogs */}
      <DeletePatientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        patients={patients}
        onDelete={onDeletePatient}
      />

      <DeleteDocumentDialog
        open={deleteDocumentDialogOpen}
        onOpenChange={setDeleteDocumentDialogOpen}
      />

      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadDocument}
      />
    </>
  );
}
