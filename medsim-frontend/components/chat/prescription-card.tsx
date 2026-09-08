"use client";

import { memo } from "react";
import { Pill, Activity, Check, X, ShieldAlert, BadgeCheck } from "lucide-react";
import type { PrescriptionResultMessage, AppMode } from "@/types/api";
import { ScoringReportCard } from "./diagnosis-card";

interface PrescriptionCardProps {
  message: PrescriptionResultMessage;
  mode?: AppMode | null;
}

export const PrescriptionCard = memo(function PrescriptionCard({ message, mode }: PrescriptionCardProps) {
  const { evaluation, report } = message;

  if (!evaluation || !report) return null;

  return (
    <>
      <div className="w-full flex justify-center py-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
        <div className="max-w-[700px] w-full glass rounded-[32px] overflow-hidden shadow-xl border border-med-border-default/50">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-med-blue/10 to-transparent p-6 sm:p-8 flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-med-blue flex items-center justify-center shrink-0 shadow-lg shadow-med-blue/20">
              <Pill className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-med-text-primary font-heading">
                Évaluation de la Prescription
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {mode === "notation" && (
                  <>
                    <span className="text-med-text-secondary">
                      Score : <strong className="text-med-text-primary">{Math.round(evaluation.overall_score * 100)}%</strong>
                    </span>
                    <span className="text-med-text-muted">•</span>
                  </>
                )}
                <span className="text-med-text-secondary">
                  {evaluation.prescribed_molecules.length} molécule(s) proposée(s)
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 space-y-8 bg-white/40">
            
            {/* Feedback */}
            {mode !== "notation" && (
              <div className="p-5 rounded-2xl bg-white/60 border border-med-border-subtle shadow-sm">
                <h3 className="text-sm font-semibold text-med-text-primary mb-2 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="h-4 w-4 text-med-blue" />
                  Retour Pédagogique
                </h3>
                <p className="text-med-text-secondary leading-relaxed">
                  {evaluation.feedback}
                </p>
              </div>
            )}

            {/* Scores Breakdown (Mode Notation uniquement) */}
            {mode === "notation" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ScoreBox label="Molécule" score={evaluation.molecule_score} />
                <ScoreBox label="Posologie" score={evaluation.dosage_score} />
                <ScoreBox label="Voie" score={evaluation.route_score} />
                <ScoreBox label="Durée" score={evaluation.duration_score} />
              </div>
            )}

            {/* Details */}
            <div className="grid sm:grid-cols-2 gap-6">
              
              {/* Molecules analysis */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-med-text-primary border-b border-med-border-default pb-2">
                  Analyse des molécules
                </h4>
                <ul className="space-y-3 text-sm">
                  {evaluation.expected_molecules.map(expected => {
                    const prescribed = evaluation.prescribed_molecules.includes(expected) || 
                                       evaluation.prescribed_molecules.some(p => expected.toLowerCase().includes(p.toLowerCase()));
                    return (
                      <li key={expected} className="flex items-start gap-2">
                        {prescribed ? (
                          <Check className="h-4 w-4 text-med-emerald mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-med-rose mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span className={`font-medium ${prescribed ? "text-med-emerald" : "text-med-rose"}`}>
                            {expected}
                          </span>
                          {!prescribed && <p className="text-med-text-muted text-xs mt-0.5">Oublié</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Contraindications */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-med-text-primary border-b border-med-border-default pb-2">
                  Sécurité & Contre-indications
                </h4>
                <div className={`p-4 rounded-xl flex items-start gap-3 ${
                  evaluation.contraindications_respected 
                    ? "bg-med-emerald-subtle/50 text-med-emerald border border-med-emerald/20" 
                    : "bg-med-rose-subtle/50 text-med-rose border border-med-rose/20"
                }`}>
                  {evaluation.contraindications_respected ? (
                    <BadgeCheck className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm leading-relaxed">
                    {evaluation.contraindication_details}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {mode === "notation" && report && (
        <ScoringReportCard report={report} />
      )}
    </>
  );
});

function ScoreBox({ label, score }: { label: string; score: number }) {
  // Determine color based on score
  const color = score >= 0.8 ? "text-med-emerald bg-med-emerald-subtle border-med-emerald/20" :
                score >= 0.5 ? "text-med-amber bg-med-amber-subtle border-med-amber/20" :
                "text-med-rose bg-med-rose-subtle border-med-rose/20";
                
  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-white/40 shadow-sm`}>
      <span className="text-xs font-medium text-med-text-muted mb-1">{label}</span>
      <div className={`text-lg font-bold px-3 py-1 rounded-lg border ${color}`}>
        {Math.round(score * 100)}%
      </div>
    </div>
  );
}
