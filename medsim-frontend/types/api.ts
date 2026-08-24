// ==============================
// MedSim — API Types
// ==============================

// ── Patient ──

export interface Patient {
  num: number;
  chief_complaint?: string;
  specialty?: string;
  difficulty?: string;
}

export type GroupedPatients = Record<string, Patient[]>;

// ── Clinical State ──

export interface PatientAttitude {
  anxiety: string;
  precision: string;
  cooperativeness: string;
}

export interface ClinicalState {
  patient_attitude?: PatientAttitude;
  revealed_facts?: string[];
  asked_topics?: (string | string[])[];
}

// ── Pipeline Info ──

export interface Analysis {
  question_type: string;
  requires_retrieval: boolean;
  search_keywords?: string;
  target_slots?: string[];
}

export interface StateMotorInfo {
  before_count: number;
  after_count: number;
  global_topics_used?: (string | string[])[];
}

export interface VerificationInfo {
  is_valid: boolean;
  message: string;
  tentatives: number;
  contains_new_claim: boolean;
  authorized_fact_ids: string[];
  used_fact_ids: string[];
}

// ── Pedagogical ──

export interface PedagogicalEvaluation {
  is_pertinent: boolean;
  feedback: string;
}

// ── Ask Response ──

export interface AskResponse {
  answer: string;
  clinical_state: ClinicalState;
  question_count: number;
  analysis: Analysis;
  state_motor_info: StateMotorInfo;
  verification_info: VerificationInfo;
  raw_json_response: Record<string, unknown>;
  pedagogical_evaluation?: PedagogicalEvaluation;
  pedagogical_synthesis?: string;
  start_timestamp?: string;
  clinical_vignette?: string;
}

// ── Scoring Report ──

export interface ScoringScores {
  coverage: number;
  pertinence: number;
  structure: number;
  diagnostic: number;
}

export interface ScoringWeights {
  w1_coverage: number;
  w2_pertinence: number;
  w3_structure: number;
  w4_diagnostic: number;
}

export interface ScoringDetails {
  missed_topics?: string[];
  explored_topics?: string[];
  useful_questions: number;
  total_questions: number;
  useful_questions_list?: string[];
  elapsed_time?: string;
  time_limit?: string;
  within_time?: boolean;
  elapsed_seconds?: number;
}

export interface ScoringReport {
  scores: ScoringScores;
  weights: ScoringWeights;
  details: ScoringDetails;
  grade: string;
  final_score: number;
}

// ── Diagnose Response ──

export interface DiagnoseResponse {
  is_correct: boolean;
  feedback: string;
  expected_diagnosis: string;
  report?: ScoringReport;
  elapsed_seconds?: number;
  time_expired?: boolean;
}

// ── Message Types ──

export type MessageSender = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
}

export interface PedagogicalMessage {
  id: string;
  type: "pedagogical";
  evaluation: PedagogicalEvaluation;
  synthesis?: string;
  timestamp: string;
}

export interface DiagnosisResultMessage {
  id: string;
  type: "diagnosis";
  isCorrect: boolean;
  isWarning: boolean;
  feedback: string;
  expectedDiagnosis?: string;
  report?: ScoringReport;
  timestamp: string;
}

export type DisplayMessage = ChatMessage | PedagogicalMessage | DiagnosisResultMessage;

// ── App State ──

export type AppStatus = "ready" | "busy" | "error";
export type AppMode = "pedago" | "notation";

export interface PipelineData {
  analysis?: Analysis;
  stateMotorInfo?: StateMotorInfo;
  verificationInfo?: VerificationInfo;
  rawJson?: Record<string, unknown>;
}

