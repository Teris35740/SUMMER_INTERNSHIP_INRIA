"use client";

import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { DiagnosisResultMessage, ScoringReport } from "@/types/api";

// ── Score Bar ──

function ScoreBar({
  label,
  score,
  weight,
  colorVar,
}: {
  label: string;
  score: number;
  weight: number;
  colorVar: string;
}) {
  const pct = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-med-text-secondary">{label}</span>
        <span className="text-med-text-primary font-medium">
          {score.toFixed(2)}{" "}
          <span className="text-med-text-muted text-xs">
            x{weight.toFixed(2)}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-med-bg-secondary">
        <div
          className="h-full rounded-full score-bar-fill"
          style={{ width: `${pct}%`, background: colorVar }}
        />
      </div>
    </div>
  );
}

// ── Scoring Report ──

function ScoringReportCard({ report }: { report: ScoringReport }) {
  const gradeColors: Record<
    string,
    { bg: string; color: string; border: string }
  > = {
    A: {
      bg: "var(--color-med-emerald-subtle)",
      color: "var(--color-med-emerald)",
      border: "rgba(52, 211, 153, 0.3)",
    },
    B: {
      bg: "var(--color-med-teal-subtle)",
      color: "var(--color-med-teal)",
      border: "rgba(45, 212, 191, 0.3)",
    },
    C: {
      bg: "var(--color-med-amber-subtle)",
      color: "var(--color-med-amber)",
      border: "rgba(251, 191, 36, 0.3)",
    },
    D: {
      bg: "var(--color-med-rose-subtle)",
      color: "var(--color-med-rose)",
      border: "rgba(251, 113, 133, 0.3)",
    },
    F: {
      bg: "var(--color-med-red-subtle)",
      color: "var(--color-med-red)",
      border: "rgba(248, 113, 113, 0.3)",
    },
  };

  const gc = gradeColors[report.grade] || gradeColors["C"];

  return (
    <div className="animate-message-in max-w-[780px] w-full mx-auto">
      <div className="rounded-xl bg-med-bg-surface border border-med-border-default overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-med-border-subtle">
          <div className="flex items-center gap-2 text-med-text-primary font-semibold">
            <Activity size={20} />
            Rapport de Notation
          </div>
          <div
            className="text-xl font-bold px-3 py-1 rounded-lg"
            style={{
              background: gc.bg,
              color: gc.color,
              border: `1px solid ${gc.border}`,
            }}
          >
            {report.grade}
          </div>
        </div>

        {/* Final score */}
        <div className="flex items-baseline justify-center gap-1 py-4">
          <span className="text-3xl font-bold" style={{ color: gc.color }}>
            {report.final_score.toFixed(2)}
          </span>
          <span className="text-med-text-muted text-lg">/ 1.00</span>
        </div>

        {/* Score bars */}
        <div className="px-5 pb-4 space-y-3">
          <ScoreBar
            label="Couverture anamnèse"
            score={report.scores.coverage}
            weight={report.weights.w1_coverage}
            colorVar="var(--color-med-sky)"
          />
          <ScoreBar
            label="Pertinence questions"
            score={report.scores.pertinence}
            weight={report.weights.w2_pertinence}
            colorVar="var(--color-med-teal)"
          />
          <ScoreBar
            label="Structure entretien"
            score={report.scores.structure}
            weight={report.weights.w3_structure}
            colorVar="var(--color-med-violet)"
          />
          <ScoreBar
            label="Perf. diagnostique"
            score={report.scores.diagnostic}
            weight={report.weights.w4_diagnostic}
            colorVar="var(--color-med-emerald)"
          />
        </div>

        {/* Details */}
        <div className="px-5 pb-5 space-y-3 border-t border-med-border-subtle pt-4">
          {report.details.missed_topics &&
            report.details.missed_topics.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                  Thèmes non explorés
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {report.details.missed_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-rose-subtle text-med-rose"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {report.details.explored_topics &&
            report.details.explored_topics.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                  Thèmes explorés
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {report.details.explored_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-emerald-subtle text-med-emerald"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-med-text-secondary">Questions utiles</span>
            <span className="text-med-text-primary font-medium">
              {report.details.useful_questions} /{" "}
              {report.details.total_questions}
            </span>
          </div>

          {report.details.useful_questions_list &&
            report.details.useful_questions_list.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider">
                  Liste des questions utiles
                </span>
                <ul className="mt-1.5 space-y-1 list-disc list-inside text-sm text-med-text-primary">
                  {report.details.useful_questions_list.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ── Diagnosis Card ──

interface DiagnosisCardProps {
  message: DiagnosisResultMessage;
}

export function DiagnosisCard({ message }: DiagnosisCardProps) {
  const config = message.isWarning
    ? {
        icon: <AlertTriangle size={24} />,
        title: "Diagnostic refusé",
        borderColor: "border-med-amber/30",
        bgColor: "bg-med-amber-subtle",
        iconColor: "text-med-amber",
      }
    : message.isCorrect
      ? {
          icon: <CheckCircle size={24} />,
          title: "Diagnostic correct !",
          borderColor: "border-med-emerald/30",
          bgColor: "bg-med-emerald-subtle",
          iconColor: "text-med-emerald",
        }
      : {
          icon: <XCircle size={24} />,
          title: "Diagnostic incorrect",
          borderColor: "border-med-rose/30",
          bgColor: "bg-med-rose-subtle",
          iconColor: "text-med-rose",
        };

  return (
    <>
      <div className="animate-message-in max-w-[780px] w-full mx-auto">
        <div
          className={`flex items-start gap-4 p-5 rounded-xl border ${config.borderColor} ${config.bgColor}`}
        >
          <div className={`${config.iconColor} shrink-0 mt-0.5`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-med-text-primary mb-1">
              {config.title}
            </div>
            <div className="text-sm text-med-text-secondary leading-relaxed">
              {message.feedback}
            </div>
            {!message.isCorrect &&
              !message.isWarning &&
              message.expectedDiagnosis && (
                <div className="mt-2 text-sm text-med-text-secondary">
                  Diagnostic attendu :{" "}
                  <strong className="text-med-text-primary">
                    {message.expectedDiagnosis}
                  </strong>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Scoring report */}
      {message.report && !message.isWarning && (
        <ScoringReportCard report={message.report} />
      )}
    </>
  );
}
