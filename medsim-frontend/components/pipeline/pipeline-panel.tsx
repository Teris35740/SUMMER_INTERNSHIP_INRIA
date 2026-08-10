"use client";

import { Activity, X } from "lucide-react";
import { LoadingSteps } from "./loading-steps";
import { PipelineAccordions } from "./pipeline-accordions";
import type { PipelineData, AppStatus } from "@/types/api";

interface PipelinePanelProps {
  isOpen: boolean;
  status: AppStatus;
  data: PipelineData;
  onClose: () => void;
}

export function PipelinePanel({
  isOpen,
  status,
  data,
  onClose,
}: PipelinePanelProps) {
  const hasData =
    data.analysis || data.stateMotorInfo || data.verificationInfo || data.rawJson;

  return (
    <aside
      className={`fixed top-[var(--navbar-height)] right-0 bottom-0 bg-med-bg-secondary border-l border-med-border-subtle
                   flex flex-col z-50 transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                   ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      style={{ width: "var(--pipeline-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-med-border-subtle shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-med-text-primary">
          <Activity size={18} className="text-med-sky" />
          Pipeline Internals
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-[30px] h-[30px] rounded-lg
                     bg-med-bg-surface border border-med-border-subtle text-med-text-secondary
                     hover:bg-med-bg-surface-hover hover:text-med-text-primary transition-all duration-150 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {status === "busy" && (
          <LoadingSteps isLoading={status === "busy"} />
        )}

        {hasData && status !== "busy" && <PipelineAccordions data={data} />}

        {!hasData && status !== "busy" && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <Activity
              size={48}
              className="text-med-text-muted opacity-30 mb-4"
            />
            <p className="text-sm text-med-text-muted">
              Posez une question pour voir les détails du pipeline.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
