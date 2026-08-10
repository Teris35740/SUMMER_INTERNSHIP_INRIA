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
  ClinicalState,
  AppStatus,
} from "@/types/api";

interface ChatAreaProps {
  messages: DisplayMessage[];
  isTyping: boolean;
  clinicalState: ClinicalState;
  status: AppStatus;
  questionCount: number;
  minQuestions: number;
  canDiagnose: boolean;
  isPipelineOpen: boolean;
  onSend: (message: string) => void;
  onDiagnose: () => void;
  onClear: () => void;
}

export function ChatArea({
  messages,
  isTyping,
  clinicalState,
  status,
  questionCount,
  minQuestions,
  canDiagnose,
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
        className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-1 scroll-smooth"
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

      {/* Clinical State Bar */}
      <ClinicalBar clinicalState={clinicalState} />

      {/* Input */}
      <ChatInput
        status={status}
        questionCount={questionCount}
        minQuestions={minQuestions}
        canDiagnose={canDiagnose}
        onSend={onSend}
        onDiagnose={onDiagnose}
        onClear={onClear}
      />
    </main>
  );
}
