import type {
  Patient,
  GroupedPatients,
  AskResponse,
  DiagnoseResponse,
} from "@/types/api";

const API_BASE = "/api";

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
    headers: { "Content-Type": "application/json" },
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
  patientNum: number
): Promise<DeletePatientResponse> {
  const res = await fetch(`${API_BASE}/patients/${patientNum}`, {
    method: "DELETE",
  });
  return handleResponse<DeletePatientResponse>(res);
}
