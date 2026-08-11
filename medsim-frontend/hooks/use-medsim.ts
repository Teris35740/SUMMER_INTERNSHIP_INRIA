"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  fetchGroupedPatients,
  askQuestion,
  submitDiagnosis,
  clearSessionApi,
} from "@/lib/api";
import { useInterval } from "./use-interval";
import type {
  Patient,
  GroupedPatients,
  DisplayMessage,
  ChatMessage,
  PedagogicalMessage,
  DiagnosisResultMessage,
  ClinicalState,
  PipelineData,
  AppStatus,
  AppMode,
} from "@/types/api";

const SESSION_TIME_LIMIT = 600; // 10 minutes in seconds

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
  const [groupedPatients, setGroupedPatients] = useState<GroupedPatients>({});
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [currentPatientNum, setCurrentPatientNum] = useState<number>(1);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [clinicalState, setClinicalState] = useState<ClinicalState>({});
  const [clinicalVignette, setClinicalVignette] = useState<string>("");
  const [pipelineData, setPipelineData] = useState<PipelineData>({});
  const [status, setStatus] = useState<AppStatus>("ready");
  const [mode, setMode] = useState<AppMode | null>(null); // null = not yet selected
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // ── Timer State ──
  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIME_LIMIT);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const autodiagTriggeredRef = useRef(false);

  // ── Timer tick (every second when active) ──
  useInterval(
    () => {
      if (!startTimestamp) return;

      const start = new Date(startTimestamp).getTime();
      const now = Date.now();
      const elapsedSec = (now - start) / 1000;
      const remaining = Math.max(0, SESSION_TIME_LIMIT - elapsedSec);

      setTimeRemaining(remaining);

      if (remaining <= 0 && !autodiagTriggeredRef.current) {
        setSessionExpired(true);
        setTimerActive(false);
        autodiagTriggeredRef.current = true;

        // Auto-lock: force diagnosis submission
        toast.error("⏱️ Temps écoulé ! La session est terminée.");
      }
    },
    timerActive ? 1000 : null
  );

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
    setClinicalVignette("");
    setPipelineData({});
    setIsTyping(false);
    setStartTimestamp(null);
    setTimeRemaining(SESSION_TIME_LIMIT);
    setTimerActive(false);
    setSessionExpired(false);
    autodiagTriggeredRef.current = false;

    try {
      await clearSessionApi(sessionIdRef.current);
    } catch {
      console.error("Erreur clear session");
    }

    // Generate new session ID
    sessionIdRef.current = generateSessionId();
  }, []);

  // ── Load grouped patients on mount ──
  useEffect(() => {
    let cancelled = false;
    fetchGroupedPatients()
      .then((data) => {
        if (cancelled) return;
        setGroupedPatients(data);
        // Flatten for quick lookup
        const flat = Object.values(data).flat();
        setAllPatients(flat);
        if (flat.length > 0) {
          setCurrentPatientNum(flat[0].num);
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
  const currentPatient = allPatients.find((p) => p.num === currentPatientNum);

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
      if (!question.trim() || status === "busy" || sessionExpired) return;

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

        // Start timer on first response
        if (data.start_timestamp && !startTimestamp) {
          setStartTimestamp(data.start_timestamp);
          setTimerActive(true);
        }

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
        setClinicalVignette(data.clinical_vignette || "");
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
    [currentPatientNum, mode, status, sessionExpired, startTimestamp]
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

      // Stop the timer
      setTimerActive(false);

      try {
        const data = await submitDiagnosis({
          diagnosis: diagnosis.trim(),
          session_id: sessionIdRef.current,
          patient_num: currentPatientNum,
          is_pedago_mode: mode === "pedago",
        });

        setIsTyping(false);
        setSessionExpired(true); // Lock session after diagnosis

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

  return {
    // Data
    groupedPatients,
    patients: allPatients,
    currentPatient,
    currentPatientNum,
    messages,
    clinicalState,
    clinicalVignette,
    pipelineData,
    status,
    mode,
    isPipelineOpen,
    isTyping,

    // Timer
    timeRemaining,
    timerActive,
    sessionExpired,

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

