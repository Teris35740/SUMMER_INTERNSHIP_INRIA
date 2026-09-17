"use client";

import { ClipboardList, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ClinicalBarProps {
  clinicalVignette: string;
}

export function ClinicalBar({ clinicalVignette }: ClinicalBarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const hasData = clinicalVignette.length > 0;

  return (
    <div className="w-full max-w-[760px] pointer-events-auto mb-2.5">
      <div className="rounded-2xl border border-med-border-default bg-med-bg-elevated/85 backdrop-blur-xl shadow-xs overflow-hidden transition-all duration-300">
        {/* Header */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-4 py-2.5 cursor-pointer hover:bg-med-bg-surface-hover transition-colors duration-150"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-med-text-primary">
            <div className="w-6 h-6 rounded-lg bg-med-teal-subtle text-med-teal flex items-center justify-center border border-med-teal/20">
              <ClipboardList size={14} />
            </div>
            <span>Vignette Clinique</span>
            <span className="text-[0.68rem] font-medium text-med-text-muted">
              {hasData
                ? `(${collapsed ? "cliquer pour déplier" : "replier"})`
                : "(en attente des éléments cliniques)"}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-med-text-muted transition-transform duration-300 ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </button>

        {/* Content */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            collapsed ? "max-h-0 opacity-0" : "max-h-[380px] opacity-100"
          } overflow-y-auto`}
        >
          <div className="px-4 pb-4 border-t border-med-border-subtle pt-3">
            {!hasData ? (
              <p className="text-xs text-med-text-muted italic py-1">
                La vignette s&apos;enrichira automatiquement au fil de l&apos;interrogatoire et des éléments révélés par le patient.
              </p>
            ) : (
              <div className="space-y-2 text-xs sm:text-sm text-med-text-primary">
                {clinicalVignette.split("\n").map((line, i) => {
                  if (line.startsWith("### ")) {
                    return (
                      <h4
                        key={i}
                        className="text-[0.72rem] font-bold text-med-text-secondary uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-med-teal" />
                        {line.replace("### ", "")}
                      </h4>
                    );
                  }
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <p
                        key={i}
                        className="text-xs sm:text-sm font-bold text-med-text-primary mb-1.5"
                      >
                        {line.replace(/\*\*/g, "")}
                      </p>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 mb-1 ml-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-med-teal/60 mt-1.5 shrink-0" />
                        <span className="text-xs sm:text-sm text-med-text-primary leading-relaxed">
                          {line.replace("- ", "")}
                        </span>
                      </div>
                    );
                  }
                  if (line.trim() === "") {
                    return <div key={i} className="h-1" />;
                  }
                  return (
                    <p key={i} className="text-xs sm:text-sm text-med-text-primary leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
