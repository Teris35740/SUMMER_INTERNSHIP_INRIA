"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  CheckCircle,
  RotateCcw,
  Clock,
  Lock,
  Pill,
} from "lucide-react";
import type { AppStatus } from "@/types/api";

interface ChatInputProps {
  status: AppStatus;
  timeRemaining: number;
  timerActive: boolean;
  sessionExpired: boolean;
  prescriptionPhase: boolean;
  onSend: (message: string) => void;
  onDiagnose: () => void;
  onOpenPrescription: () => void;
  onClear: () => void;
}

export function ChatInput({
  status,
  timeRemaining,
  timerActive,
  sessionExpired,
  prescriptionPhase,
  onSend,
  onDiagnose,
  onOpenPrescription,
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
    if (!value.trim() || status === "busy" || sessionExpired || prescriptionPhase) return;
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

  // Format time remaining as MM:SS
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Timer color classes
  const isUrgent = timeRemaining <= 120 && timeRemaining > 30;
  const isCritical = timeRemaining <= 30;
  const timerColorClass = sessionExpired && !prescriptionPhase
    ? "bg-med-rose text-white"
    : isCritical
      ? "bg-med-rose text-white animate-pulse"
      : isUrgent
        ? "bg-med-amber-subtle text-med-amber border-med-amber/30"
        : "bg-med-bg-surface border border-med-border-default text-med-text-secondary";

  return (
    <div className="w-full flex flex-col items-center pointer-events-none z-10">
      
      {/* Top action bar (Timer & Actions) */}
      <div className="w-full max-w-[780px] flex items-center justify-between mb-3 px-2 pointer-events-auto">
        
        {/* Timer pill */}
        {prescriptionPhase ? (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-med-blue-subtle text-med-blue border border-med-blue/30">
           <Pill size={14} />
           <span>Phase de prescription</span>
         </div>
        ) : sessionExpired ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-med-rose text-white">
            <Lock size={14} />
            <span>Session terminée</span>
          </div>
        ) : timerActive ? (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors duration-300 ${timerColorClass}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <Clock size={14} />
            <span>{timeStr}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-med-bg-surface border border-med-border-default text-med-text-secondary">
            <Clock size={14} />
            <span>10:00</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {prescriptionPhase ? (
            <button
              onClick={onOpenPrescription}
              disabled={status === "busy" || sessionExpired}
              title="Proposer une ordonnance"
              className="flex items-center justify-center gap-1.5 w-[32px] sm:w-auto h-[32px] sm:h-auto sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold shadow-sm
                         bg-med-bg-surface border border-med-border-default text-med-text-primary
                         hover:bg-med-blue hover:text-white hover:border-transparent transition-all duration-200
                         disabled:opacity-40 disabled:hover:bg-med-bg-surface disabled:hover:text-med-text-primary disabled:hover:border-med-border-default disabled:cursor-not-allowed cursor-pointer"
            >
              <Pill size={14} />
              <span className="hidden sm:inline">Prescrire</span>
            </button>
          ) : (
            <button
              onClick={onDiagnose}
              disabled={status === "busy" || sessionExpired}
              title="Proposer un diagnostic"
              className="flex items-center justify-center gap-1.5 w-[32px] sm:w-auto h-[32px] sm:h-auto sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold shadow-sm
                         bg-med-bg-surface border border-med-border-default text-med-text-primary
                         hover:bg-med-emerald hover:text-white hover:border-transparent transition-all duration-200
                         disabled:opacity-40 disabled:hover:bg-med-bg-surface disabled:hover:text-med-text-primary disabled:hover:border-med-border-default disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Diagnostiquer</span>
            </button>
          )}
          <button
            onClick={onClear}
            disabled={status === "busy"}
            title="Réinitialiser la session"
            className="flex items-center justify-center gap-1.5 w-[32px] sm:w-auto h-[32px] sm:h-auto sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold shadow-sm
                       bg-med-bg-surface border border-med-border-subtle text-med-text-secondary
                       hover:bg-med-rose hover:text-white hover:border-transparent transition-all duration-200
                       disabled:opacity-40 disabled:hover:bg-med-bg-surface disabled:hover:text-med-text-secondary disabled:hover:border-med-border-subtle disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Nouveau</span>
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
              placeholder={prescriptionPhase ? "Cliquez sur 'Prescrire' pour rédiger votre ordonnance" : sessionExpired ? "Session terminée — cliquez sur Nouveau pour recommencer" : "Posez une question au patient..."}
              rows={1}
              autoComplete="off"
              disabled={status === "busy" || sessionExpired || prescriptionPhase}
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
            disabled={!value.trim() || status === "busy" || sessionExpired || prescriptionPhase}
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


