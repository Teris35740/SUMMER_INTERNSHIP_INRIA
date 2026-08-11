"use client";

import { ClipboardList, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ClinicalState } from "@/types/api";

interface ClinicalBarProps {
  clinicalState: ClinicalState;
}

export function ClinicalBar({ clinicalState }: ClinicalBarProps) {
  const [collapsed, setCollapsed] = useState(true);

  const hasData =
    clinicalState.patient_attitude ||
    (clinicalState.revealed_facts && clinicalState.revealed_facts.length > 0) ||
    (clinicalState.asked_topics && clinicalState.asked_topics.length > 0);

  return (
    <div className="w-full max-w-[780px] pointer-events-auto mb-3">
      <div className="glass-panel rounded-2xl overflow-hidden transition-all duration-300">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-5 py-3 cursor-pointer hover:bg-med-bg-surface-hover transition-colors duration-150"
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold text-med-text-primary">
            <ClipboardList size={18} className="text-med-teal" />
            <span>État Clinique (Notes de Synthèse)</span>
          </div>
          <ChevronDown
            size={18}
            className={`text-med-text-muted transition-transform duration-300 ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </button>

        {/* Content */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            collapsed ? "max-h-0 opacity-0" : "max-h-[300px] opacity-100"
          } overflow-y-auto`}
        >
          <div className="px-5 pb-4 border-t border-med-border-subtle pt-3">
            {!hasData ? (
              <p className="text-sm text-med-text-muted italic">
                En attente des données du patient...
              </p>
            ) : (
              <div className="space-y-4">
                {/* Patient Attitude */}
                {clinicalState.patient_attitude && (
                  <div>
                    <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-med-sky" />
                      Attitude du patient
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-med-bg-surface border border-med-border-default text-med-text-primary shadow-sm">
                        Anxiété: <span className="text-med-sky">{clinicalState.patient_attitude.anxiety}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-med-bg-surface border border-med-border-default text-med-text-primary shadow-sm">
                        Précision: <span className="text-med-teal">{clinicalState.patient_attitude.precision}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-med-bg-surface border border-med-border-default text-med-text-primary shadow-sm">
                        Coopération: <span className="text-med-violet">{clinicalState.patient_attitude.cooperativeness}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Revealed Facts */}
                {clinicalState.revealed_facts &&
                  clinicalState.revealed_facts.length > 0 && (
                    <div>
                      <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-med-emerald" />
                        Faits révélés
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {clinicalState.revealed_facts.map((fact, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-med-emerald-subtle text-med-emerald border border-med-emerald/20"
                          >
                            {fact}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Asked Topics */}
                {clinicalState.asked_topics &&
                  clinicalState.asked_topics.length > 0 && (
                    <div>
                      <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-med-violet" />
                        Sujets abordés
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {clinicalState.asked_topics.map((topicGroup, i) => {
                          if (Array.isArray(topicGroup)) {
                            return topicGroup.map((topic, j) => (
                              <span
                                key={`${i}-${j}`}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet border border-med-violet/20"
                              >
                                {topic}
                              </span>
                            ));
                          }
                          return (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet border border-med-violet/20"
                            >
                              {topicGroup}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
