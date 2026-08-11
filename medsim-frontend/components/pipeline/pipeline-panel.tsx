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
      className={`fixed top-0 right-0 bottom-0 bg-med-bg-secondary/80 backdrop-blur-3xl border-l border-med-border-default
                   flex flex-col z-[150] transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl
                   ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      style={{ width: "var(--pipeline-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-med-border-default shrink-0 bg-med-bg-surface/50">
        <h2 className="flex items-center gap-2.5 text-[0.95rem] font-bold text-med-text-primary tracking-tight">
          <Activity size={18} className="text-med-sky" />
          Pipeline Internals
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full
                     bg-transparent text-med-text-secondary
                     hover:bg-med-bg-surface hover:text-med-text-primary transition-all duration-200 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {status === "busy" && (
          <div className="p-4">
            <div className="glass rounded-2xl p-2">
              <LoadingSteps isLoading={status === "busy"} />
            </div>
          </div>
        )}

        {hasData && status !== "busy" && (
          <div className="p-4">
            <PipelineAccordions data={data} />
          </div>
        )}

        {!hasData && status !== "busy" && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 rounded-full bg-med-bg-surface flex items-center justify-center mb-4 shadow-inner border border-med-border-subtle">
              <Activity
                size={32}
                className="text-med-text-muted opacity-50"
              />
            </div>
            <p className="text-sm text-med-text-secondary font-medium">
              Posez une question pour voir les détails du pipeline.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
