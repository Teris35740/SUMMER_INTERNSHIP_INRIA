"use client";

import { ClipboardList, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ClinicalState } from "@/types/api";

interface ClinicalBarProps {
  clinicalState: ClinicalState;
}

export function ClinicalBar({ clinicalState }: ClinicalBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const hasData =
    clinicalState.patient_attitude ||
    (clinicalState.revealed_facts && clinicalState.revealed_facts.length > 0) ||
    (clinicalState.asked_topics && clinicalState.asked_topics.length > 0);

  return (
    <div className="border-t border-med-border-subtle bg-med-bg-surface/50">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-2.5 cursor-pointer hover:bg-med-bg-surface-hover transition-colors duration-150"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-med-text-secondary">
          <ClipboardList size={16} />
          <span>État Clinique</span>
        </div>
        <ChevronUp
          size={16}
          className={`text-med-text-muted transition-transform duration-200 ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-3">
          {!hasData ? (
            <p className="text-sm text-med-text-muted italic">
              En attente des données du patient...
            </p>
          ) : (
            <div className="space-y-2.5">
              {/* Patient Attitude */}
              {clinicalState.patient_attitude && (
                <div>
                  <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                    Attitude du patient
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-bg-surface border border-med-border-subtle text-med-text-primary">
                      Anxiété: {clinicalState.patient_attitude.anxiety}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-teal-subtle text-med-teal">
                      Précision: {clinicalState.patient_attitude.precision}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet">
                      Coopération:{" "}
                      {clinicalState.patient_attitude.cooperativeness}
                    </span>
                  </div>
                </div>
              )}

              {/* Revealed Facts */}
              {clinicalState.revealed_facts &&
                clinicalState.revealed_facts.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                      Faits révélés
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {clinicalState.revealed_facts.map((fact, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-emerald-subtle text-med-emerald"
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
                    <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                      Sujets abordés
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {clinicalState.asked_topics.map((topicGroup, i) => {
                        if (Array.isArray(topicGroup)) {
                          return topicGroup.map((topic, j) => (
                            <span
                              key={`${i}-${j}`}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet"
                            >
                              {topic}
                            </span>
                          ));
                        }
                        return (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet"
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
      )}
    </div>
  );
}
