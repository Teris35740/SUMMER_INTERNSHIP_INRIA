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
    <div className="w-full flex flex-col items-center pointer-events-none z-10">
      
      {/* Top action bar (Counters & Actions) */}
      <div className="w-full max-w-[780px] flex items-center justify-between mb-3 px-2 pointer-events-auto">
        
        {/* Question counter pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors duration-300
            ${canDiagnose 
              ? "bg-med-emerald text-white" 
              : "bg-med-bg-surface border border-med-border-default text-med-text-secondary"
            }`}
        >
          {canDiagnose ? (
            <CheckCircle size={14} />
          ) : (
            <MessageSquare size={14} />
          )}
          <span>
            {canDiagnose
              ? "Diagnostic disponible"
              : `${questionCount}/${minQuestions} questions avant diagnostic`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDiagnose}
            disabled={!canDiagnose || status === "busy"}
            title={
              canDiagnose
                ? "Proposer un diagnostic"
                : `Posez encore ${minQuestions - questionCount} question(s)`
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm
                       bg-med-bg-surface border border-med-border-default text-med-text-primary
                       hover:bg-med-emerald hover:text-white hover:border-transparent transition-all duration-200
                       disabled:opacity-40 disabled:hover:bg-med-bg-surface disabled:hover:text-med-text-primary disabled:hover:border-med-border-default disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle size={14} />
            <span>Diagnostiquer</span>
          </button>
          <button
            onClick={onClear}
            disabled={status === "busy"}
            title="Réinitialiser la session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm
                       bg-med-bg-surface border border-med-border-subtle text-med-text-secondary
                       hover:bg-med-rose hover:text-white hover:border-transparent transition-all duration-200
                       disabled:opacity-40 disabled:hover:bg-med-bg-surface disabled:hover:text-med-text-secondary disabled:hover:border-med-border-subtle disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Input Pill */}
      <div className="w-full max-w-[780px] pointer-events-auto">
        <div className="glass-panel flex items-end gap-2 p-2 rounded-[28px] shadow-lg transition-shadow duration-300 focus-within:shadow-glow focus-within:border-med-border-focus">
          <div className="flex-1 relative flex items-center min-h-[44px]">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez une question au patient..."
              rows={1}
              autoComplete="off"
              disabled={status === "busy"}
              className="w-full px-4 py-2.5 bg-transparent border-none
                         text-sm text-med-text-primary placeholder:text-med-text-muted
                         focus:outline-none focus:ring-0
                         resize-none transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         max-h-[160px] overflow-y-auto"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!value.trim() || status === "busy"}
            title="Envoyer (Entrée)"
            className="flex items-center justify-center w-[44px] h-[44px] rounded-full
                       bg-gradient-user-msg text-white shadow-md
                       hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200
                       disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
