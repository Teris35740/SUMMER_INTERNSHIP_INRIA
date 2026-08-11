"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  fetchPatients,
  askQuestion,
  submitDiagnosis,
  clearSessionApi,
} from "@/lib/api";
import type {
  Patient,
  DisplayMessage,
  ChatMessage,
  PedagogicalMessage,
  DiagnosisResultMessage,
  ClinicalState,
  PipelineData,
  AppStatus,
  AppMode,
} from "@/types/api";

// Generate a unique session ID per browser tab
function generateSessionId(): string {
  return `session_${crypto.randomUUID()}`;
}

function createTimestamp(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  sender: "system",
  text: "Bienvenue ! Sélectionnez un patient et posez vos questions pour établir un diagnostic.",
  timestamp: createTimestamp(),
};

export function useMedSim() {
  // ── Session ──
  const sessionIdRef = useRef<string>(generateSessionId());

  // ── State ──
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatientNum, setCurrentPatientNum] = useState<number>(1);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [questionCount, setQuestionCount] = useState(0);
  const [clinicalState, setClinicalState] = useState<ClinicalState>({});
  const [pipelineData, setPipelineData] = useState<PipelineData>({});
  const [status, setStatus] = useState<AppStatus>("ready");
  const [mode, setMode] = useState<AppMode | null>(null); // null = not yet selected
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // ── Clear session (defined before references) ──
  const performClear = useCallback(async () => {
    setMessages([
      {
        id: "reset",
        sender: "system",
        text: "Session réinitialisée. Posez vos questions au patient.",
        timestamp: createTimestamp(),
      } as ChatMessage,
    ]);
    setClinicalState({});
    setPipelineData({});
    setQuestionCount(0);
    setIsTyping(false);

    try {
      await clearSessionApi(sessionIdRef.current);
    } catch {
      console.error("Erreur clear session");
    }
  }, []);

  // ── Load patients on mount ──
  useEffect(() => {
    let cancelled = false;
    fetchPatients()
      .then((data) => {
        if (cancelled) return;
        setPatients(data);
        if (data.length > 0) {
          setCurrentPatientNum(data[0].num);
        }
      })
      .catch(() => {
        if (cancelled) return;
        console.error("Error loading patients");
        toast.error("Impossible de charger la liste des patients.");
      });
    return () => { cancelled = true; };
  }, []);

  // ── Get current patient ──
  const currentPatient = patients.find((p) => p.num === currentPatientNum);

  // ── Select patient ──
  const selectPatient = useCallback(
    async (num: number) => {
      setCurrentPatientNum(num);
      // Reset session when changing patient
      await performClear();
    },
    [performClear]
  );

  // ── Send message ──
  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || status === "busy") return;

      // Add user message
      const userMsg: ChatMessage = {
        id: createId(),
        sender: "user",
        text: question.trim(),
        timestamp: createTimestamp(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("busy");
      setIsTyping(true);

      // Open pipeline
      setIsPipelineOpen(true);

      try {
        const data = await askQuestion({
          question: question.trim(),
          session_id: sessionIdRef.current,
          patient_num: currentPatientNum,
          is_pedago_mode: mode === "pedago",
        });

        setIsTyping(false);

        // Add assistant message
        const assistantMsg: ChatMessage = {
          id: createId(),
          sender: "assistant",
          text: data.answer,
          timestamp: createTimestamp(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Add pedagogical feedback if in pedago mode
        if (mode === "pedago" && data.pedagogical_evaluation) {
          const pedagoMsg: PedagogicalMessage = {
            id: createId(),
            type: "pedagogical",
            evaluation: data.pedagogical_evaluation,
            synthesis: data.pedagogical_synthesis,
            timestamp: createTimestamp(),
          };
          setMessages((prev) => [...prev, pedagoMsg]);
        }

        // Update state
        setClinicalState(data.clinical_state);
        setQuestionCount(data.question_count);
        setPipelineData({
          analysis: data.analysis,
          stateMotorInfo: data.state_motor_info,
          verificationInfo: data.verification_info,
          rawJson: data.raw_json_response,
        });

        setStatus("ready");
      } catch (error) {
        setIsTyping(false);
        const message =
          error instanceof Error
            ? error.message
            : "Erreur de communication avec le serveur.";
        toast.error(message);
        setStatus("error");
        setTimeout(() => setStatus("ready"), 3000);
      }
    },
    [currentPatientNum, mode, status]
  );

  // ── Diagnose ──
  const diagnose = useCallback(
    async (diagnosis: string) => {
      if (!diagnosis.trim() || status === "busy") return;

      // Add user diagnosis message
      const userMsg: ChatMessage = {
        id: createId(),
        sender: "user",
        text: `Diagnostic : ${diagnosis.trim()}`,
        timestamp: createTimestamp(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("busy");
      setIsTyping(true);

      try {
        const data = await submitDiagnosis({
          diagnosis: diagnosis.trim(),
          session_id: sessionIdRef.current,
          patient_num: currentPatientNum,
          is_pedago_mode: mode === "pedago",
        });

        setIsTyping(false);

        const diagResult: DiagnosisResultMessage = {
          id: createId(),
          type: "diagnosis",
          isCorrect: data.is_correct,
          isWarning: false,
          feedback: data.feedback,
          expectedDiagnosis: data.expected_diagnosis,
          report: data.report,
          timestamp: createTimestamp(),
        };
        setMessages((prev) => [...prev, diagResult]);
        setStatus("ready");
      } catch (error) {
        setIsTyping(false);
        const detail =
          error instanceof Error ? error.message : "Erreur inconnue";
        const diagResult: DiagnosisResultMessage = {
          id: createId(),
          type: "diagnosis",
          isCorrect: false,
          isWarning: true,
          feedback: detail,
          timestamp: createTimestamp(),
        };
        setMessages((prev) => [...prev, diagResult]);
        setStatus("ready");
      }
    },
    [currentPatientNum, mode, status]
  );

  // ── Toggle pipeline ──
  const togglePipeline = useCallback(() => {
    setIsPipelineOpen((prev) => !prev);
  }, []);

  // ── Min questions for diagnosis ──
  const minQuestions = 3;
  const canDiagnose = questionCount >= minQuestions;

  return {
    // Data
    patients,
    currentPatient,
    currentPatientNum,
    messages,
    questionCount,
    minQuestions,
    canDiagnose,
    clinicalState,
    pipelineData,
    status,
    mode,
    isPipelineOpen,
    isTyping,

    // Actions
    selectPatient,
    sendMessage,
    diagnose,
    clearSession: performClear,
    togglePipeline,
    setMode,
    setIsPipelineOpen,
  };
}
