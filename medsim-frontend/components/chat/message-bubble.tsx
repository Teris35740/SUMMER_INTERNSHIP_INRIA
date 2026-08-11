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
      <div className="flex items-start gap-2.5 animate-message-in max-w-[780px] w-full mx-auto justify-center mb-2">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-med-border-subtle text-[0.8rem] text-med-text-secondary font-medium">
          <Info size={16} className="text-med-sky shrink-0" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  if (message.sender === "user") {
    return (
      <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto justify-end group">
        <div className="flex flex-col items-end">
          <div className="px-5 py-3.5 rounded-[24px] rounded-br-sm bg-gradient-user-msg text-white text-sm leading-relaxed max-w-[600px] shadow-md border border-white/10">
            {message.text}
          </div>
          <span className="text-[0.65rem] text-med-text-muted mt-1.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {message.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-sky/10 text-med-sky shrink-0 shadow-sm border border-med-sky/20">
          <Stethoscope size={18} />
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto group">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-bg-surface border border-med-border-default text-med-text-secondary shrink-0 shadow-sm">
        <User size={18} />
      </div>
      <div>
        <div
          className="px-5 py-3.5 rounded-[24px] rounded-bl-sm glass text-sm text-med-text-primary leading-relaxed max-w-[600px]"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
        />
        <span className="text-[0.65rem] text-med-text-muted mt-1.5 ml-2 block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

// ── Pedagogical Feedback ──

function PedagogicalBubble({ message }: { message: PedagogicalMessage }) {
  return (
    <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto group">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-violet-subtle text-med-violet shrink-0 shadow-sm border border-med-violet/20">
        <GraduationCap size={18} />
      </div>
      <div className="flex-1 max-w-[650px]">
        <div className="rounded-[20px] rounded-bl-sm glass-panel overflow-hidden border-med-violet/20">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-med-border-subtle bg-med-violet/5">
            <GraduationCap size={18} className="text-med-violet" />
            <span className="text-sm font-bold text-med-violet tracking-tight">
              Évaluation Pédagogique
            </span>
          </div>

          {/* Pertinence */}
          <div className="px-5 py-4 border-b border-med-border-subtle">
            <h4 className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest mb-2">
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
            <div className="px-5 py-4 bg-med-bg-surface/30">
              <h4 className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest mb-2">
                Revue de cours rapide
              </h4>
              <div
                className="text-sm text-med-text-primary leading-relaxed opacity-90"
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
