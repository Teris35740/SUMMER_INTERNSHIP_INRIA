import type {
  Patient,
  GroupedPatients,
  AskResponse,
  DiagnoseResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  AuthUser,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
const TOKEN_KEY = "medsim_access_token";
const USER_KEY = "medsim_user";

// ── Auth Storage Helpers ──

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      (errData as { detail?: string }).detail || `Erreur HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ── AUTH ENDPOINTS ──

export async function loginUser(req: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse<TokenResponse>(res);
}

export async function registerUser(req: RegisterRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse<TokenResponse>(res);
}

// ── GET /api/patients ──

export async function fetchPatients(): Promise<Patient[]> {
  const res = await fetch(`${API_BASE}/patients`);
  return handleResponse<Patient[]>(res);
}

// ── GET /api/patients/grouped ──

export async function fetchGroupedPatients(): Promise<GroupedPatients> {
  const res = await fetch(`${API_BASE}/patients/grouped`);
  return handleResponse<GroupedPatients>(res);
}

// ── POST /api/ask ──

export interface AskParams {
  question: string;
  session_id: string;
  patient_num: number;
  is_pedago_mode: boolean;
}

export async function askQuestion(params: AskParams): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<AskResponse>(res);
}

// ── POST /api/diagnose ──

export interface DiagnoseParams {
  diagnosis: string;
  session_id: string;
  patient_num: number;
  is_pedago_mode: boolean;
}

export async function submitDiagnosis(
  params: DiagnoseParams
): Promise<DiagnoseResponse> {
  const res = await fetch(`${API_BASE}/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<DiagnoseResponse>(res);
}

// ── POST /api/prescribe ──

import type { PrescribeParams, PrescribeResponse } from "@/types/api";

export async function submitPrescription(
  params: PrescribeParams
): Promise<PrescribeResponse> {
  const res = await fetch(`${API_BASE}/prescribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<PrescribeResponse>(res);
}

// ── POST /api/clear ──

export async function clearSessionApi(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "", session_id: sessionId }),
  });
}

// ── POST /api/patients (Create) ──

export interface CreatePatientResponse {
  patient_num: number;
  patient_id: string;
  status: string;
}

export async function createPatient(
  data: Record<string, unknown>
): Promise<CreatePatientResponse> {
  const res = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<CreatePatientResponse>(res);
}

// ── DELETE /api/patients/:num ──

export interface DeletePatientResponse {
  patient_num: number;
  patient_id: string;
  status: string;
  deleted_chunks: number;
}

export async function deletePatient(
  patientNum: number | string
): Promise<DeletePatientResponse> {
  const res = await fetch(`${API_BASE}/patients/${patientNum}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<DeletePatientResponse>(res);
}

// ── POST /api/patients/upload-pdf ──

export interface UploadDocumentResponse {
  filename: string;
  status: string;
}

export async function uploadPatientDocument(
  file: File
): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/patients/upload-pdf`, {
    method: "POST",
    body: formData, // Do not set Content-Type header manually for FormData
  });
  return handleResponse<UploadDocumentResponse>(res);
}

// ── GET /api/patients/documents ──

export interface PatientDocument {
  filename: string;
  size: number;
}

export async function fetchPatientDocuments(): Promise<PatientDocument[]> {
  const res = await fetch(`${API_BASE}/patients/documents`);
  return handleResponse<PatientDocument[]>(res);
}

// ── DELETE /api/patients/documents/:filename ──

export interface DeleteDocumentResponse {
  filename: string;
  status: string;
  deleted_chunks: number;
}

export async function deletePatientDocument(
  filename: string
): Promise<DeleteDocumentResponse> {
  const res = await fetch(`${API_BASE}/patients/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  return handleResponse<DeleteDocumentResponse>(res);
}

