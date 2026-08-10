"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  CheckCircle,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import type { AppStatus } from "@/types/api";

interface ChatInputProps {
  status: AppStatus;
  questionCount: number;
  minQuestions: number;
  canDiagnose: boolean;
  onSend: (message: string) => void;
  onDiagnose: () => void;
  onClear: () => void;
}

export function ChatInput({
  status,
  questionCount,
  minQuestions,
  canDiagnose,
  onSend,
  onDiagnose,
  onClear,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleSend = () => {
    if (!value.trim() || status === "busy") return;
    onSend(value);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-med-border-subtle bg-med-bg-primary/80 backdrop-blur-lg px-4 py-3">
      {/* Input row */}
      <div className="flex items-end gap-2 max-w-[780px] mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question au patient..."
            rows={1}
            autoComplete="off"
            disabled={status === "busy"}
            className="w-full px-4 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                       text-sm text-med-text-primary placeholder:text-med-text-muted
                       focus:outline-none focus:border-med-border-focus focus:ring-1 focus:ring-med-sky/30
                       resize-none transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!value.trim() || status === "busy"}
          title="Envoyer (Entrée)"
          className="flex items-center justify-center w-10 h-10 rounded-xl
                     bg-gradient-user-msg text-white
                     hover:opacity-90 transition-opacity duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between max-w-[780px] mx-auto mt-2">
        {/* Question counter */}
        <div
          className={`flex items-center gap-1.5 text-xs ${
            canDiagnose ? "text-med-emerald" : "text-med-text-muted"
          }`}
        >
          {canDiagnose ? (
            <CheckCircle size={14} />
          ) : (
            <MessageSquare size={14} />
          )}
          <span>
            {canDiagnose
              ? `${questionCount} question(s) — Diagnostic disponible`
              : `${questionCount}/${minQuestions} questions avant diagnostic`}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDiagnose}
            disabled={!canDiagnose || status === "busy"}
            title={
              canDiagnose
                ? "Proposer un diagnostic"
                : `Posez encore ${minQuestions - questionCount} question(s)`
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-med-emerald-subtle text-med-emerald border border-med-emerald/20
                       hover:bg-med-emerald/20 transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle size={14} />
            <span>Diagnostiquer</span>
          </button>
          <button
            onClick={onClear}
            disabled={status === "busy"}
            title="Réinitialiser la session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-med-bg-surface text-med-text-secondary border border-med-border-subtle
                       hover:bg-med-bg-surface-hover hover:text-med-text-primary transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Nouvelle Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
