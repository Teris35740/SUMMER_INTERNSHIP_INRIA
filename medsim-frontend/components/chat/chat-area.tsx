"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { DiagnosisCard } from "./diagnosis-card";
import { PrescriptionCard } from "./prescription-card";
import { TypingIndicator } from "./typing-indicator";
import { ClinicalBar } from "./clinical-bar";
import { ChatInput } from "./chat-input";
import type {
  DisplayMessage,
  DiagnosisResultMessage,
  PrescriptionResultMessage,
  AppStatus,
  AppMode,
} from "@/types/api";

interface ChatAreaProps {
  mode: AppMode | null;
  messages: DisplayMessage[];
  isTyping: boolean;
  clinicalVignette: string;
  status: AppStatus;
  timeRemaining: number;
  timerActive: boolean;
  sessionExpired: boolean;
  isPipelineOpen: boolean;
  prescriptionPhase: boolean;
  onSend: (message: string) => void;
  onDiagnose: () => void;
  onOpenPrescription: () => void;
  onClear: () => void;
}

export function ChatArea({
  mode,
  messages,
  isTyping,
  clinicalVignette,
  status,
  timeRemaining,
  timerActive,
  sessionExpired,
  isPipelineOpen,
  prescriptionPhase,
  onSend,
  onDiagnose,
  onOpenPrescription,
  onClear,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages, isTyping]);

  return (
    <main
      className="flex-1 flex flex-col min-w-0 transition-[margin-right] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        marginRight: isPipelineOpen ? "var(--pipeline-mr)" : "0",
      }}
    >
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-[280px] flex flex-col gap-6 scroll-smooth"
      >
        {messages.map((msg) => {
          if ("type" in msg && msg.type === "diagnosis") {
            return (
              <DiagnosisCard
                key={msg.id}
                message={msg as DiagnosisResultMessage}
                mode={mode}
              />
            );
          }
          if ("type" in msg && msg.type === "prescription") {
            return (
              <PrescriptionCard
                key={msg.id}
                message={msg as PrescriptionResultMessage}
                mode={mode}
              />
            );
          }
          return <MessageBubble key={msg.id} message={msg} />;
        })}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Fixed Bottom Container (Clinical Bar + Input) */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex flex-col items-center pointer-events-none z-10">
        <ClinicalBar clinicalVignette={clinicalVignette} />
        <ChatInput
          status={status}
          timeRemaining={timeRemaining}
          timerActive={timerActive}
          sessionExpired={sessionExpired}
          prescriptionPhase={prescriptionPhase}
          onSend={onSend}
          onDiagnose={onDiagnose}
          onOpenPrescription={onOpenPrescription}
          onClear={onClear}
        />
      </div>
    </main>
  );
}

