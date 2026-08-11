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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-med-text-secondary font-medium">{label}</span>
        <span className="text-med-text-primary font-bold">
          {score.toFixed(2)}{" "}
          <span className="text-med-text-muted text-[0.7rem] font-normal ml-1">
            (x{weight.toFixed(2)})
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-med-bg-surface overflow-hidden shadow-inner border border-med-border-subtle">
        <div
          className="h-full rounded-full score-bar-fill shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
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
    { bg: string; color: string; border: string; shadow: string }
  > = {
    A: {
      bg: "var(--color-med-emerald-subtle)",
      color: "var(--color-med-emerald)",
      border: "rgba(52, 211, 153, 0.3)",
      shadow: "0 0 20px rgba(52, 211, 153, 0.15)",
    },
    B: {
      bg: "var(--color-med-teal-subtle)",
      color: "var(--color-med-teal)",
      border: "rgba(45, 212, 191, 0.3)",
      shadow: "0 0 20px rgba(45, 212, 191, 0.15)",
    },
    C: {
      bg: "var(--color-med-amber-subtle)",
      color: "var(--color-med-amber)",
      border: "rgba(251, 191, 36, 0.3)",
      shadow: "0 0 20px rgba(251, 191, 36, 0.15)",
    },
    D: {
      bg: "var(--color-med-rose-subtle)",
      color: "var(--color-med-rose)",
      border: "rgba(251, 113, 133, 0.3)",
      shadow: "0 0 20px rgba(251, 113, 133, 0.15)",
    },
    F: {
      bg: "var(--color-med-red-subtle)",
      color: "var(--color-med-red)",
      border: "rgba(248, 113, 113, 0.3)",
      shadow: "0 0 20px rgba(248, 113, 113, 0.15)",
    },
  };

  const gc = gradeColors[report.grade] || gradeColors["C"];

  return (
    <div className="animate-message-in max-w-[780px] w-full mx-auto mt-4">
      <div className="rounded-[24px] glass-panel overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-med-border-subtle bg-med-bg-surface/50">
          <div className="flex items-center gap-2.5 text-med-text-primary font-bold tracking-tight">
            <Activity size={20} className="text-med-sky" />
            Rapport de Notation
          </div>
          <div
            className="text-2xl font-black px-4 py-1.5 rounded-xl flex items-center justify-center"
            style={{
              background: gc.bg,
              color: gc.color,
              border: `1px solid ${gc.border}`,
              boxShadow: gc.shadow,
              fontFamily: "var(--font-heading)",
            }}
          >
            {report.grade}
          </div>
        </div>

        {/* Final score */}
        <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-b from-med-bg-surface/10 to-transparent">
          <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest mb-1">
            Score Global
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-5xl font-black tracking-tight"
              style={{ color: gc.color, fontFamily: "var(--font-heading)" }}
            >
              {report.final_score.toFixed(2)}
            </span>
            <span className="text-med-text-muted text-xl font-medium">/ 1.00</span>
          </div>
        </div>

        {/* Score bars */}
        <div className="px-6 pb-6 space-y-4">
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
        <div className="px-6 pb-6 pt-5 space-y-4 border-t border-med-border-subtle bg-med-bg-surface/30">
          {report.details.missed_topics &&
            report.details.missed_topics.length > 0 && (
              <div>
                <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-med-rose" />
                  Thèmes non explorés
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {report.details.missed_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-med-rose-subtle text-med-rose border border-med-rose/20"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {report.details.explored_topics &&
            report.details.explored_topics.length > 0 && (
              <div className="mt-4">
                <span className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-med-emerald" />
                  Thèmes explorés
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {report.details.explored_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-med-emerald-subtle text-med-emerald border border-med-emerald/20"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-6 p-4 rounded-xl glass border-med-border-subtle">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-med-text-primary font-bold">
                Questions utiles posées
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-med-bg-secondary text-med-text-primary font-bold text-xs border border-med-border-default">
                {report.details.useful_questions} / {report.details.total_questions}
              </span>
            </div>

            {report.details.useful_questions_list &&
              report.details.useful_questions_list.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                  {report.details.useful_questions_list.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-med-text-secondary">
                      <CheckCircle size={14} className="text-med-emerald shrink-0 mt-0.5" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
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
        borderColor: "border-med-amber/40",
        bgColor: "bg-med-amber-subtle",
        iconColor: "text-med-amber",
        shadow: "shadow-[0_4px_24px_rgba(251,191,36,0.15)]",
      }
    : message.isCorrect
      ? {
          icon: <CheckCircle size={24} />,
          title: "Diagnostic correct !",
          borderColor: "border-med-emerald/40",
          bgColor: "bg-med-emerald-subtle",
          iconColor: "text-med-emerald",
          shadow: "shadow-[0_4px_24px_rgba(52,211,153,0.15)]",
        }
      : {
          icon: <XCircle size={24} />,
          title: "Diagnostic incorrect",
          borderColor: "border-med-rose/40",
          bgColor: "bg-med-rose-subtle",
          iconColor: "text-med-rose",
          shadow: "shadow-[0_4px_24px_rgba(251,113,133,0.15)]",
        };

  return (
    <>
      <div className="animate-message-in max-w-[780px] w-full mx-auto my-2">
        <div
          className={`flex items-start gap-4 p-5 rounded-[20px] border backdrop-blur-md ${config.borderColor} ${config.bgColor} ${config.shadow}`}
        >
          <div className={`${config.iconColor} shrink-0 mt-0.5`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-med-text-primary mb-1 text-lg tracking-tight">
              {config.title}
            </div>
            <div className="text-sm text-med-text-secondary leading-relaxed font-medium">
              {message.feedback}
            </div>
            {!message.isCorrect &&
              !message.isWarning &&
              message.expectedDiagnosis && (
                <div className="mt-3 p-3 rounded-xl bg-med-bg-surface/50 border border-med-border-subtle text-sm">
                  <span className="text-med-text-secondary">Diagnostic attendu : </span>
                  <strong className="text-med-text-primary block mt-1">
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
