"use client";

import { Info, Stethoscope, User, GraduationCap } from "lucide-react";
import type {
  ChatMessage,
  PedagogicalMessage,
  DisplayMessage,
} from "@/types/api";

// ── Helpers ──

function formatMarkdown(text: string): string {
  let result = text;
  // Bold **text**
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Line breaks
  result = result.replace(/\n/g, "<br />");
  return result;
}

// ── Chat Message Bubble ──

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.sender === "system") {
    return (
      <div className="flex items-start gap-2.5 animate-message-in max-w-[780px] w-full mx-auto">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-med-sky/[0.06] border border-med-sky/10 text-sm text-med-text-secondary">
          <Info size={18} className="text-med-sky shrink-0" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  if (message.sender === "user") {
    return (
      <div className="flex items-end gap-2.5 animate-message-in max-w-[780px] w-full mx-auto justify-end">
        <div className="flex flex-col items-end">
          <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-gradient-user-msg text-white text-sm leading-relaxed max-w-[600px]">
            {message.text}
          </div>
          <span className="text-[0.7rem] text-med-text-muted mt-1 mr-1">
            {message.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-med-sky/20 text-med-sky shrink-0">
          <Stethoscope size={16} />
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-end gap-2.5 animate-message-in max-w-[780px] w-full mx-auto">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-med-bg-surface border border-med-border-subtle text-med-text-secondary shrink-0">
        <User size={16} />
      </div>
      <div>
        <div
          className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-med-bg-surface border border-med-border-subtle text-sm text-med-text-primary leading-relaxed max-w-[600px]"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
        />
        <span className="text-[0.7rem] text-med-text-muted mt-1 ml-1 block">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

// ── Pedagogical Feedback ──

function PedagogicalBubble({ message }: { message: PedagogicalMessage }) {
  return (
    <div className="flex items-end gap-2.5 animate-message-in max-w-[780px] w-full mx-auto">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-med-violet-subtle text-med-violet shrink-0">
        <GraduationCap size={16} />
      </div>
      <div className="flex-1">
        <div className="rounded-xl bg-med-bg-surface border border-med-violet/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-med-border-subtle bg-med-violet/[0.06]">
            <GraduationCap size={18} className="text-med-violet" />
            <span className="text-sm font-semibold text-med-violet">
              Évaluation Pédagogique
            </span>
          </div>

          {/* Pertinence */}
          <div className="px-4 py-3 border-b border-med-border-subtle">
            <h4 className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider mb-1">
              Pertinence de la question
            </h4>
            <p className="text-sm text-med-text-primary">
              <strong
                className={
                  message.evaluation.is_pertinent
                    ? "text-med-emerald"
                    : "text-med-rose"
                }
              >
                {message.evaluation.is_pertinent
                  ? "Pertinent"
                  : "Non pertinent"}
              </strong>{" "}
              : {message.evaluation.feedback}
            </p>
          </div>

          {/* Synthesis */}
          {message.synthesis && (
            <div className="px-4 py-3">
              <h4 className="text-xs font-semibold text-med-text-secondary uppercase tracking-wider mb-1">
                Revue de cours rapide
              </h4>
              <div
                className="text-sm text-med-text-primary leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(message.synthesis),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exported Component ──

interface MessageBubbleProps {
  message: DisplayMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if ("type" in message && message.type === "pedagogical") {
    return <PedagogicalBubble message={message as PedagogicalMessage} />;
  }

  // Diagnosis messages are handled by DiagnosisCard
  if ("type" in message && message.type === "diagnosis") {
    return null;
  }

  return <ChatBubble message={message as ChatMessage} />;
}
