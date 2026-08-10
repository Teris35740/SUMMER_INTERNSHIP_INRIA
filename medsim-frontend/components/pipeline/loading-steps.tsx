"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useInterval } from "@/hooks/use-interval";

interface Step {
  id: string;
  text: string;
}

const STEPS: Step[] = [
  { id: "step-analysis", text: "Analyse de la question" },
  { id: "step-motor", text: "Filtrage (State Motor)" },
  { id: "step-gen", text: "Vérification" },
];

interface LoadingStepsProps {
  isLoading: boolean;
}

export function LoadingSteps({ isLoading }: LoadingStepsProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);

  // Reset when loading starts
  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
    if (isLoading) {
      setActiveStep(0);
    }
  }

  // Advance steps while loading
  useInterval(
    () => {
      setActiveStep((prev) => (prev < STEPS.length ? prev + 1 : prev));
    },
    isLoading ? 800 : null
  );

  // When not loading, show all steps as done
  const displayStep = isLoading ? activeStep : STEPS.length;

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider mb-3">
        Progression
      </h3>
      <ul className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = i < displayStep;
          const isActive = i === displayStep && isLoading;

          return (
            <li
              key={step.id}
              className={`flex items-center gap-2.5 text-sm transition-colors duration-200 ${
                isDone
                  ? "text-med-emerald"
                  : isActive
                    ? "text-med-sky"
                    : "text-med-text-muted"
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold shrink-0
                  ${
                    isDone
                      ? "bg-med-emerald-subtle text-med-emerald"
                      : isActive
                        ? "bg-med-sky-subtle text-med-sky animate-status-pulse"
                        : "bg-med-bg-secondary text-med-text-muted"
                  }`}
              >
                {isDone ? <Check size={12} /> : i + 1}
              </span>
              <span>{step.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
