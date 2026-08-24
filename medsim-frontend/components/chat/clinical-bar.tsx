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
    <div className="w-full max-w-[780px] pointer-events-auto mb-3">
      <div className="glass-panel rounded-2xl overflow-hidden transition-all duration-300">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-5 py-3 cursor-pointer hover:bg-med-bg-surface-hover transition-colors duration-150"
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold text-med-text-primary">
            <ClipboardList size={18} className="text-med-teal" />
            <span>Vignette Clinique</span>
            {hasData && (
              <span className="text-[0.65rem] font-medium text-med-text-muted ml-1">
                (cliquez pour {collapsed ? "afficher" : "masquer"})
              </span>
            )}
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
            collapsed ? "max-h-0 opacity-0" : "max-h-[400px] opacity-100"
          } overflow-y-auto`}
        >
          <div className="px-5 pb-4 border-t border-med-border-subtle pt-3">
            {!hasData ? (
              <p className="text-sm text-med-text-muted italic">
                En attente des données du patient... Posez votre première question pour commencer.
              </p>
            ) : (
              <div className="prose prose-sm max-w-none text-med-text-primary">
                {clinicalVignette.split("\n").map((line, i) => {
                  // Render markdown-like formatting
                  if (line.startsWith("### ")) {
                    return (
                      <h4
                        key={i}
                        className="text-[0.75rem] font-bold text-med-text-secondary uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1.5"
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
                        className="text-sm font-bold text-med-text-primary mb-2"
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
                        <span className="w-1 h-1 rounded-full bg-med-text-muted mt-2 shrink-0" />
                        <span className="text-sm text-med-text-primary leading-relaxed">
                          {line.replace("- ", "")}
                        </span>
                      </div>
                    );
                  }
                  if (line.trim() === "") {
                    return <div key={i} className="h-1" />;
                  }
                  return (
                    <p key={i} className="text-sm text-med-text-primary leading-relaxed">
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

