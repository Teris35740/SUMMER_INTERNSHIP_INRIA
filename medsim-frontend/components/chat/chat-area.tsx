"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { DiagnosisCard } from "./diagnosis-card";
import { TypingIndicator } from "./typing-indicator";
import { ClinicalBar } from "./clinical-bar";
import { ChatInput } from "./chat-input";
import type {
  DisplayMessage,
  DiagnosisResultMessage,
  AppStatus,
} from "@/types/api";

interface ChatAreaProps {
  messages: DisplayMessage[];
  isTyping: boolean;
  clinicalVignette: string;
  status: AppStatus;
  timeRemaining: number;
  timerActive: boolean;
  sessionExpired: boolean;
  isPipelineOpen: boolean;
  onSend: (message: string) => void;
  onDiagnose: () => void;
  onClear: () => void;
}

export function ChatArea({
  messages,
  isTyping,
  clinicalVignette,
  status,
  timeRemaining,
  timerActive,
  sessionExpired,
  isPipelineOpen,
  onSend,
  onDiagnose,
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
        marginRight: isPipelineOpen ? "var(--pipeline-width)" : "0",
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
          onSend={onSend}
          onDiagnose={onDiagnose}
          onClear={onClear}
        />
      </div>
    </main>
  );
}

