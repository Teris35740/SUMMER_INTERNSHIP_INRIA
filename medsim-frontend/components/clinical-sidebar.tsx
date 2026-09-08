"use client";

import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pill,
  Plus,
  Trash2,
  ChevronRight,
  Stethoscope,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  X,
  Sparkles,
} from "lucide-react";
import type { ClinicalSubmitPayload, PrescriptionMolecule, AppStatus, AppMode, Patient } from "@/types/api";

// ── Types ──

interface ClinicalSidebarProps {
  status: AppStatus;
  mode: AppMode | null;
  sessionExpired: boolean;
  prescriptionPhase: boolean;
  diagnosisResult: {
    isCorrect: boolean;
    isWarning?: boolean;
    feedback: string;
    expectedDiagnosis?: string;
  } | null;
  sessionLocked: boolean;
  currentPatient?: Patient;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onSubmitDiagnosis: (payload: ClinicalSubmitPayload) => void;
  onSubmitPrescription: (molecules: PrescriptionMolecule[]) => void;
}

// ── Hypothesis Input ──

function HypothesisInput({
  index,
  value,
  locked,
  onChange,
  onClear,
}: {
  index: number;
  value: string;
  locked: boolean;
  onChange: (val: string) => void;
  onClear: () => void;
}) {
  const placeholders = [
    "Hypothèse principale…",
    "Diagnostic alternatif 1…",
    "Diagnostic alternatif 2…",
  ];

  return (
    <div className="flex items-center gap-2 group">
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-med-bg-secondary border border-med-border-default text-[0.68rem] font-bold text-med-text-secondary shrink-0 select-none shadow-xs">
        {index + 1}
      </span>
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          maxLength={80}
          placeholder={placeholders[index]}
          className={`
            w-full pl-3 pr-7 py-2 rounded-xl text-xs sm:text-sm transition-all duration-200
            border bg-med-bg-surface/90 text-med-text-primary
            placeholder:text-med-text-muted shadow-xs
            focus:outline-none focus:bg-med-bg-elevated focus:ring-2 focus:ring-med-amber/30 focus:border-med-amber
            ${locked
              ? "border-med-border-subtle bg-med-bg-secondary/40 text-med-text-secondary cursor-not-allowed opacity-75"
              : "border-med-border-default hover:border-med-amber/40"
            }
          `}
        />
        {!locked && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-med-text-muted hover:text-med-text-primary p-0.5 rounded-md hover:bg-med-bg-secondary transition-colors"
            title="Effacer"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({
  icon,
  title,
  stepNumber,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  title: string;
  stepNumber?: number;
  badge?: React.ReactNode;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">{icon}</div>
        <span className="text-xs font-bold text-med-text-primary uppercase tracking-wider truncate">
          {stepNumber && (
            <span className="text-med-text-muted mr-1.5 font-mono">{stepNumber}.</span>
          )}
          {title}
        </span>
      </div>
      {badge && (
        <span
          className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border shrink-0 flex items-center gap-1 ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Empty Molecule Row ──

function emptyMolecule(): PrescriptionMolecule {
  return { name: "", dosage: "", route: "", duration: "" };
}

// ── Main Sidebar Content ──

function SidebarContent({
  status,
  mode,
  sessionExpired,
  prescriptionPhase,
  diagnosisResult,
  sessionLocked,
  onSubmitDiagnosis,
  onSubmitPrescription,
}: ClinicalSidebarProps) {
  const [hypotheses, setHypotheses] = useState<[string, string, string]>(["", "", ""]);
  const [hypothesesLocked, setHypothesesLocked] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [isDiagnosisSubmitting, setIsDiagnosisSubmitting] = useState(false);
  const [diagnosisSubmitted, setDiagnosisSubmitted] = useState(false);
  const [molecules, setMolecules] = useState<PrescriptionMolecule[]>([emptyMolecule()]);
  const prescriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prescriptionPhase && !hypothesesLocked) {
      setHypothesesLocked(true);
      setDiagnosisSubmitted(true);
      setIsDiagnosisSubmitting(false);
    }
  }, [prescriptionPhase, hypothesesLocked]);

  useEffect(() => {
    if (prescriptionPhase && prescriptionRef.current) {
      setTimeout(() => {
        prescriptionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }, [prescriptionPhase]);

  const handleHypothesisChange = (i: number, val: string) => {
    const next = [...hypotheses] as [string, string, string];
    next[i] = val;
    setHypotheses(next);
  };

  const handleClearHypothesis = (i: number) => {
    const next = [...hypotheses] as [string, string, string];
    next[i] = "";
    setHypotheses(next);
  };

  const handleDiagnosisSubmit = () => {
    if (!finalDiagnosis.trim() || isDiagnosisSubmitting || status === "busy") return;
    setIsDiagnosisSubmitting(true);
    onSubmitDiagnosis({
      differential_diagnoses: hypotheses.filter((h) => h.trim()),
      final_diagnosis: finalDiagnosis.trim(),
    });
  };

  const handleDiagnosisKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleDiagnosisSubmit();
    }
  };

  const handleMoleculeChange = (index: number, field: keyof PrescriptionMolecule, value: string) => {
    const next = [...molecules];
    next[index] = { ...next[index], [field]: value };
    setMolecules(next);
  };

  const handleAddMolecule = () => {
    if (molecules.length >= 5) return;
    setMolecules([...molecules, emptyMolecule()]);
  };

  const handleRemoveMolecule = (i: number) => {
    if (molecules.length <= 1) return;
    setMolecules(molecules.filter((_, idx) => idx !== i));
  };

  const isPrescriptionEmpty = molecules.every(
    (m) => !m.name.trim() && !m.dosage.trim() && !m.route.trim() && !m.duration.trim()
  );

  const handlePrescriptionSubmit = () => {
    const valid = molecules.filter(
      (m) => m.name.trim() || m.dosage.trim() || m.route.trim() || m.duration.trim()
    );
    onSubmitPrescription(valid);
  };

  const hasDiagnosisText = finalDiagnosis.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 p-3.5 sm:p-4 overflow-y-auto h-full scroll-smooth">

      {/* PHASE 1 — Hypothèses différentielles */}
      <div
        className={`
          rounded-2xl p-4 border transition-all duration-300 shadow-xs
          ${hypothesesLocked
            ? "bg-med-bg-surface/50 border-med-border-subtle"
            : "bg-med-bg-surface border-med-amber/35 shadow-sm"
          }
        `}
      >
        <SectionHeader
          icon={
            <div className={`p-1 rounded-md ${hypothesesLocked ? "bg-med-bg-secondary text-med-text-muted" : "bg-med-amber-subtle text-med-amber"}`}>
              <Brain size={14} />
            </div>
          }
          title="Hypothèses"
          stepNumber={1}
          badge={hypothesesLocked ? "Verrouillé" : "Brouillon libre"}
          badgeColor={
            hypothesesLocked
              ? "bg-med-bg-secondary border-med-border-default text-med-text-muted"
              : "bg-med-amber-subtle text-med-amber border-med-amber/30"
          }
        />

        <div className="space-y-2">
          {hypotheses.map((h, i) => (
            <HypothesisInput
              key={i}
              index={i}
              value={h}
              locked={hypothesesLocked || sessionLocked}
              onChange={(val) => handleHypothesisChange(i, val)}
              onClear={() => handleClearHypothesis(i)}
            />
          ))}
        </div>

        {!hypothesesLocked && (
          <p className="text-[0.68rem] text-med-text-muted mt-3 leading-relaxed flex items-center gap-1.5">
            <Sparkles size={11} className="text-med-amber shrink-0" />
            <span>Optionnel — notez vos pistes au fil de l&apos;interrogatoire (bonus).</span>
          </p>
        )}

        {hypothesesLocked && diagnosisResult && mode === "notation" && hypotheses.filter(Boolean).length === 0 && (
          <p className="text-[0.68rem] text-med-text-muted italic mt-2.5">
            Aucune hypothèse différentielle soumise.
          </p>
        )}
      </div>

      {/* PHASE 2 — Diagnostic Final */}
      <div
        className={`
          rounded-2xl p-4 border transition-all duration-300 shadow-xs
          ${diagnosisSubmitted
            ? diagnosisResult?.isCorrect
              ? "bg-med-emerald-subtle/15 border-med-emerald/30 shadow-sm"
              : diagnosisResult?.isWarning
                ? "bg-med-amber-subtle/15 border-med-amber/30 shadow-sm"
                : "bg-med-rose-subtle/15 border-med-rose/30 shadow-sm"
            : "bg-med-bg-surface border-med-border-default shadow-sm"
          }
        `}
      >
        <SectionHeader
          icon={
            <div
              className={`p-1 rounded-md ${
                diagnosisSubmitted
                  ? diagnosisResult?.isCorrect
                    ? "bg-med-emerald-subtle text-med-emerald"
                    : diagnosisResult?.isWarning
                      ? "bg-med-amber-subtle text-med-amber"
                      : "bg-med-rose-subtle text-med-rose"
                  : "bg-med-sky-subtle text-med-sky"
              }`}
            >
              {diagnosisSubmitted ? (
                diagnosisResult?.isCorrect ? (
                  <CheckCircle2 size={14} />
                ) : diagnosisResult?.isWarning ? (
                  <AlertTriangle size={14} />
                ) : (
                  <XCircle size={14} />
                )
              ) : (
                <Stethoscope size={14} />
              )}
            </div>
          }
          title="Diagnostic Final"
          stepNumber={2}
          badge={
            diagnosisSubmitted ? (
              diagnosisResult?.isCorrect ? (
                <>Correct</>
              ) : diagnosisResult?.isWarning ? (
                <>Précision requise</>
              ) : (
                <>Non retenu</>
              )
            ) : undefined
          }
          badgeColor={
            diagnosisResult?.isCorrect
              ? "bg-med-emerald-subtle text-med-emerald border-med-emerald/30"
              : diagnosisResult?.isWarning
                ? "bg-med-amber-subtle text-med-amber border-med-amber/30"
                : "bg-med-rose-subtle text-med-rose border-med-rose/30"
          }
        />

        {!diagnosisSubmitted ? (
          <>
            <textarea
              value={finalDiagnosis}
              onChange={(e) => setFinalDiagnosis(e.target.value)}
              onKeyDown={handleDiagnosisKeyDown}
              disabled={sessionExpired || sessionLocked || isDiagnosisSubmitting}
              placeholder="Formulez votre diagnostic principal (ex : Sciatique L5 aiguë droite)…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm resize-none bg-med-bg-primary/80 border border-med-border-default text-med-text-primary placeholder:text-med-text-muted focus:outline-none focus:bg-med-bg-elevated focus:ring-2 focus:ring-med-sky/30 focus:border-med-sky transition-all duration-150 mb-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            />
            <button
              onClick={handleDiagnosisSubmit}
              disabled={
                !hasDiagnosisText ||
                isDiagnosisSubmitting ||
                status === "busy" ||
                sessionExpired ||
                sessionLocked
              }
              className={`
                w-full flex items-center justify-center gap-2
                py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200
                ${
                  !hasDiagnosisText || isDiagnosisSubmitting || status === "busy" || sessionExpired || sessionLocked
                    ? "bg-med-bg-secondary border border-med-border-default text-med-text-muted cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-med-sky to-med-teal text-white shadow-md shadow-med-sky/25 hover:shadow-lg hover:shadow-med-sky/35 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                }
              `}
            >
              {isDiagnosisSubmitting || status === "busy" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Évaluation clinique…</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>{hasDiagnosisText ? "Verrouiller le Diagnostic" : "Saisir un diagnostic"}</span>
                </>
              )}
            </button>
            <p className="text-[0.65rem] text-med-text-muted text-center mt-2">
              Touche <kbd className="px-1.5 py-0.5 bg-med-bg-secondary border border-med-border-default rounded text-[0.6rem] font-mono">Entrée ↵</kbd> pour soumettre
            </p>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-med-bg-surface/80 border border-med-border-default shadow-xs">
              <span className="text-[0.62rem] font-bold text-med-text-muted uppercase tracking-wider block mb-1">
                Votre diagnostic soumis
              </span>
              <p className="text-xs sm:text-sm font-bold text-med-text-primary leading-snug">
                {finalDiagnosis}
              </p>
            </div>

            {diagnosisResult && (
              <div className="px-1">
                <p className="text-xs text-med-text-secondary leading-relaxed">
                  {diagnosisResult.feedback}
                </p>
              </div>
            )}

            {diagnosisResult && !diagnosisResult.isCorrect && !diagnosisResult.isWarning && diagnosisResult.expectedDiagnosis && (
              <div className="p-2.5 rounded-xl bg-med-bg-secondary/70 border border-med-border-default">
                <span className="text-[0.62rem] text-med-text-muted font-bold uppercase tracking-wider block mb-0.5">
                  Diagnostic attendu
                </span>
                <p className="text-xs text-med-text-primary font-semibold">
                  {diagnosisResult.expectedDiagnosis}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PHASE 3 — Prescription */}
      <div
        ref={prescriptionRef}
        className={`
          rounded-2xl border transition-all duration-500 shadow-xs
          ${sessionLocked
            ? "bg-med-bg-surface/60 border-med-border-default"
            : prescriptionPhase
              ? "bg-med-bg-surface border-med-sky/40 shadow-md shadow-med-sky/5 animate-in fade-in slide-in-from-bottom-2 duration-300"
              : "bg-med-bg-surface/35 border-med-border-subtle"
          }
        `}
      >
        <div className="p-4">
          <SectionHeader
            icon={
              <div
                className={`p-1 rounded-md ${
                  prescriptionPhase
                    ? "bg-med-sky-subtle text-med-sky"
                    : sessionLocked
                      ? "bg-med-emerald-subtle text-med-emerald"
                      : "bg-med-bg-secondary text-med-text-muted"
                }`}
              >
                <Pill size={14} />
              </div>
            }
            title="Prescription"
            stepNumber={3}
            badge={
              sessionLocked ? (
                <>Soumise</>
              ) : prescriptionPhase ? (
                <>Active</>
              ) : (
                <>
                  <Lock size={10} /> En attente
                </>
              )
            }
            badgeColor={
              sessionLocked
                ? "bg-med-emerald-subtle text-med-emerald border-med-emerald/30"
                : prescriptionPhase
                  ? "bg-med-sky-subtle text-med-sky border-med-sky/30"
                  : "bg-med-bg-secondary border-med-border-default text-med-text-muted"
            }
          />

          {!prescriptionPhase && !sessionLocked && (
            <div className="py-2 text-center">
              <p className="text-xs text-med-text-muted leading-relaxed">
                Cette étape se débloque automatiquement après validation de votre diagnostic.
              </p>
            </div>
          )}

          {prescriptionPhase && !sessionLocked && (
            <div className="space-y-3">
              {molecules.map((mol, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-med-border-default bg-med-bg-secondary/50 relative group shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.62rem] font-bold text-med-text-muted uppercase tracking-wider">
                      Médicament #{index + 1}
                    </span>
                    {molecules.length > 1 && (
                      <button
                        onClick={() => handleRemoveMolecule(index)}
                        className="text-med-text-muted hover:text-med-rose p-1 rounded-md hover:bg-med-rose-subtle transition-colors"
                        title="Supprimer ce médicament"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-[0.6rem] font-bold text-med-text-muted uppercase tracking-wider mb-1 block">
                        Molécule (DCI)
                      </label>
                      <input
                        type="text"
                        value={mol.name}
                        onChange={(e) => handleMoleculeChange(index, "name", e.target.value)}
                        placeholder="Ex : Paracétamol, Amoxicilline…"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-med-bg-primary border border-med-border-default text-med-text-primary placeholder:text-med-text-muted focus:outline-none focus:ring-2 focus:ring-med-sky/30 focus:border-med-sky transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[0.6rem] font-bold text-med-text-muted uppercase tracking-wider mb-1 block">
                        Posologie
                      </label>
                      <input
                        type="text"
                        value={mol.dosage}
                        onChange={(e) => handleMoleculeChange(index, "dosage", e.target.value)}
                        placeholder="1g x3/j"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-med-bg-primary border border-med-border-default text-med-text-primary placeholder:text-med-text-muted focus:outline-none focus:ring-2 focus:ring-med-sky/30 focus:border-med-sky transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[0.6rem] font-bold text-med-text-muted uppercase tracking-wider mb-1 block">
                        Voie
                      </label>
                      <input
                        type="text"
                        value={mol.route}
                        onChange={(e) => handleMoleculeChange(index, "route", e.target.value)}
                        placeholder="Orale, IV…"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-med-bg-primary border border-med-border-default text-med-text-primary placeholder:text-med-text-muted focus:outline-none focus:ring-2 focus:ring-med-sky/30 focus:border-med-sky transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[0.6rem] font-bold text-med-text-muted uppercase tracking-wider mb-1 block">
                        Durée du traitement
                      </label>
                      <input
                        type="text"
                        value={mol.duration}
                        onChange={(e) => handleMoleculeChange(index, "duration", e.target.value)}
                        placeholder="5 jours, 3 semaines…"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-med-bg-primary border border-med-border-default text-med-text-primary placeholder:text-med-text-muted focus:outline-none focus:ring-2 focus:ring-med-sky/30 focus:border-med-sky transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {molecules.length < 5 && (
                <button
                  onClick={handleAddMolecule}
                  className="w-full py-2.5 rounded-xl border border-dashed border-med-border-strong text-xs font-semibold text-med-text-secondary hover:border-med-sky hover:text-med-sky hover:bg-med-sky-subtle/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Ajouter un médicament ({molecules.length}/5)</span>
                </button>
              )}

              <button
                onClick={handlePrescriptionSubmit}
                disabled={isPrescriptionEmpty || status === "busy"}
                className={`
                  w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold mt-2 transition-all duration-200
                  ${
                    isPrescriptionEmpty || status === "busy"
                      ? "bg-med-bg-secondary border border-med-border-default text-med-text-muted cursor-not-allowed opacity-75"
                      : "bg-gradient-to-r from-med-sky to-med-teal text-white shadow-md shadow-med-sky/25 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  }
                `}
              >
                {status === "busy" ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Évaluation de l&apos;ordonnance…</span>
                  </>
                ) : (
                  <>
                    <ChevronRight size={15} />
                    <span>Soumettre l&apos;ordonnance</span>
                  </>
                )}
              </button>
            </div>
          )}

          {sessionLocked && (
            <div className="p-3 rounded-xl bg-med-emerald-subtle/20 border border-med-emerald/25 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-med-emerald">
                <CheckCircle2 size={15} />
                <span>Ordonnance évaluée</span>
              </div>
              <p className="text-[0.68rem] text-med-text-secondary">
                Consultez la synthèse et votre note détaillée dans le fil de discussion.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Export — Responsive Wrapper ──

export function ClinicalSidebar({
  isOpen = true,
  onToggleOpen,
  ...props
}: ClinicalSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          hidden md:flex flex-col shrink-0 border-med-border-default bg-med-bg-elevated/80 backdrop-blur-2xl overflow-hidden shadow-sm h-full
          transition-all duration-300 ease-in-out
          ${isOpen
            ? "w-[350px] lg:w-[380px] border-l opacity-100 translate-x-0"
            : "w-0 border-l-0 opacity-0 pointer-events-none translate-x-4"
          }
        `}
      >
        {/* Header */}
        <div className="h-[74px] sm:h-[80px] shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-med-border-default bg-med-bg-surface/70 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-med-sky-subtle text-med-sky border border-med-sky/20 shadow-xs shrink-0">
              <Stethoscope size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-med-text-primary uppercase tracking-wider block leading-tight truncate">
                Dossier Clinique
              </span>
              <span className="text-[0.62rem] text-med-text-muted font-medium block mt-0.5 truncate">
                Conclusion diagnostique
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Stepper progress dots */}
            <div className="flex items-center gap-1.5 bg-med-bg-secondary px-2.5 py-1 rounded-full border border-med-border-default shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  props.diagnosisResult ? "bg-med-emerald" : "bg-med-amber animate-pulse"
                }`}
                title="1. Hypothèses"
              />
              <span className="text-[0.65rem] text-med-text-muted font-mono">/</span>
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  props.prescriptionPhase || props.sessionLocked
                    ? "bg-med-emerald"
                    : props.diagnosisResult
                      ? "bg-med-sky animate-pulse"
                      : "bg-med-border-strong"
                }`}
                title="2. Diagnostic"
              />
              <span className="text-[0.65rem] text-med-text-muted font-mono">/</span>
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  props.sessionLocked
                    ? "bg-med-emerald"
                    : props.prescriptionPhase
                      ? "bg-med-sky animate-pulse"
                      : "bg-med-border-strong"
                }`}
                title="3. Prescription"
              />
            </div>

            {/* Collapse toggle button */}
            {onToggleOpen && (
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-secondary transition-colors cursor-pointer"
                title="Masquer le dossier clinique (Cmd+B)"
              >
                <PanelRightClose size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden w-[350px] lg:w-[380px]">
          <SidebarContent {...props} />
        </div>
      </aside>

      {/* Mobile floating button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-[90px] right-4 z-30 w-12 h-12 rounded-full shadow-xl bg-med-bg-elevated border border-med-border-default flex items-center justify-center text-med-text-primary hover:bg-med-bg-surface-hover transition-all duration-200 hover:scale-105 active:scale-95"
        title="Dossier Clinique"
      >
        <PanelRightOpen size={20} />
        {!props.prescriptionPhase && !props.sessionLocked && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-med-amber border-2 border-med-bg-elevated animate-pulse" />
        )}
      </button>

      {/* Mobile Sheet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[360px] max-w-[92vw] bg-med-bg-elevated border-l border-med-border-default shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-med-border-default bg-med-bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-med-sky-subtle text-med-sky border border-med-sky/20">
                  <Stethoscope size={16} />
                </div>
                <span className="text-xs font-bold text-med-text-primary uppercase tracking-wider">
                  Dossier Clinique
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-surface-hover transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent {...props} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
