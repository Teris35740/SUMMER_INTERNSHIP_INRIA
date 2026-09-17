// ==============================
// MedSim — API Types
// ==============================

// ── Authentication ──

export type UserRole = "PROFESSOR" | "STUDENT";

export interface AuthUser {
  id?: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

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

// ── Images & Examens ──

export interface RevealedImage {
  id: string;
  patient_id: string;
  fact_id?: string;
  image_type: string;
  file_name: string;
  mime_type?: string;
  description?: string;
  url: string;
}

export interface PatientImage {
  id: string;
  patient_id: string;
  fact_id?: string;
  image_type: string;
  file_name: string;
  mime_type: string;
  file_size_bytes?: number;
  description?: string;
  reveal_policy: string;
  created_at: string;
  url?: string;
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
  images?: RevealedImage[];
}

// ── Scoring Report ──

export interface ScoringScores {
  coverage: number;
  pertinence: number;
  structure: number;
  diagnostic: number;
  prescription?: number;
}

export interface ScoringWeights {
  w1_coverage: number;
  w2_pertinence: number;
  w3_structure: number;
  w4_diagnostic: number;
  w5_prescription?: number;
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
  prescription_details?: PrescriptionEvaluation;
  // Diagnostics différentiels
  differential_diagnoses?: string[];
  matched_differentials?: string[];
  differential_bonus?: number;
}

export interface ScoringReport {
  scores: ScoringScores;
  weights: ScoringWeights;
  details: ScoringDetails;
  grade: string;
  final_score: number;
}

// ── Diagnose ──

export interface ClinicalSubmitPayload {
  differential_diagnoses: string[];  // 0 à 3 éléments (optionnel)
  final_diagnosis: string;           // obligatoire
}

export interface DiagnoseParams {
  diagnosis: string;
  differential_diagnoses: string[];
  session_id: string;
  patient_num: number;
  is_pedago_mode: boolean;
}

// ── Diagnose Response ──

export interface DiagnoseResponse {
  is_correct: boolean;
  is_warning?: boolean;
  feedback: string;
  expected_diagnosis: string;
  report?: ScoringReport;
  elapsed_seconds?: number;
  time_expired?: boolean;
}

// ── Prescription ──

export interface PrescriptionMolecule {
  name: string;
  dosage: string;
  route: string;
  duration: string;
}

export interface PrescribeParams {
  session_id: string;
  patient_num: number;
  is_pedago_mode: boolean;
  molecules: PrescriptionMolecule[];
}

export interface PrescriptionEvaluation {
  molecule_score: number;
  dosage_score: number;
  route_score: number;
  duration_score: number;
  contraindications_respected: boolean;
  overall_score: number;
  feedback: string;
  expected_molecules: string[];
  prescribed_molecules: string[];
  missed_molecules: string[];
  contraindication_details: string;
}

export interface PrescribeResponse {
  status: string;
  prescription_evaluation?: PrescriptionEvaluation;
  report?: ScoringReport;
  error?: string;
}

// ── Message Types ──

export type MessageSender = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  images?: RevealedImage[];
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
  report?: ScoringReport; // Keeping this for backward compatibility or when prescription is skipped
  timestamp: string;
}

export interface PrescriptionResultMessage {
  id: string;
  type: "prescription";
  evaluation?: PrescriptionEvaluation;
  report?: ScoringReport;
  timestamp: string;
}

export type DisplayMessage = ChatMessage | PedagogicalMessage | DiagnosisResultMessage | PrescriptionResultMessage;

// ── App State ──

export type AppStatus = "ready" | "busy" | "error";
export type AppMode = "pedago" | "notation";

export interface PipelineData {
  analysis?: Analysis;
  stateMotorInfo?: StateMotorInfo;
  verificationInfo?: VerificationInfo;
  rawJson?: Record<string, unknown>;
}


