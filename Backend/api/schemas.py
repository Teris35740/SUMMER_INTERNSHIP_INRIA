from pydantic import BaseModel
from typing import Optional, List, Dict

class AskRequest(BaseModel):
    question: str
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False

class RevealedImage(BaseModel):
    id: str
    patient_id: str
    fact_id: Optional[str] = None
    image_type: str
    file_name: str
    mime_type: Optional[str] = None
    description: Optional[str] = None
    url: str

class AskResponse(BaseModel):
    answer: str
    analysis: dict
    clinical_state: dict
    raw_json_response: dict
    history: list
    question_count: int
    retrieval_info: dict
    reranking_info: list
    state_motor_info: dict
    context_sent_to_llm: str
    verification_info: dict
    timing: dict
    pedagogical_evaluation: Optional[dict] = None
    pedagogical_synthesis: Optional[str] = None
    start_timestamp: Optional[str] = None
    clinical_vignette: Optional[str] = None
    images: List[RevealedImage] = []

class DiagnoseRequest(BaseModel):
    diagnosis: str
    differential_diagnoses: List[str] = []
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False

class DiagnoseResponse(BaseModel):
    is_correct: bool
    is_warning: bool = False
    feedback: str
    expected_diagnosis: str
    report: Optional[dict] = None
    elapsed_seconds: Optional[float] = None
    time_expired: bool = False


# ── Prescription ──

class PrescriptionMolecule(BaseModel):
    name: str
    dosage: str
    route: str
    duration: str

class PrescribeRequest(BaseModel):
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False
    molecules: List[PrescriptionMolecule]

class PrescribeResponse(BaseModel):
    status: str
    prescription_evaluation: Optional[dict] = None
    report: Optional[dict] = None
    error: Optional[str] = None


class ClearRequest(BaseModel):
    question: str = ""
    session_id: str = "session_1"

class PatientSummary(BaseModel):
    num: int
    patient_id: str
    age: Optional[int] = None
    gender: Optional[str] = None
    difficulty: Optional[str] = None
    specialty: Optional[str] = None
    chief_complaint: Optional[str] = None


# ── Patient Creation ──

class MedicalFact(BaseModel):
    information: str
    reveal_policy: str
    fact_id: Optional[str] = None
    image: Optional[dict] = None

class PatientAttitudeInput(BaseModel):
    anxiety: float = 0.5
    precision: float = 0.5
    cooperativeness: float = 0.8

class IdentityInput(BaseModel):
    age: int
    gender: str
    patient_attitude: PatientAttitudeInput = PatientAttitudeInput()

class ChiefComplaintInput(BaseModel):
    information: str
    reveal_policy: str = "direct_if_asked"

class MoleculeInput(BaseModel):
    name: str
    dosage: str
    route: str
    duration: str

class ExpectedTreatmentInput(BaseModel):
    molecules: List[MoleculeInput]
    contraindications_to_check: List[str] = []

class MetadataInput(BaseModel):
    difficulty: str
    specialty: str
    expected_diagnosis: str
    alternative_diagnoses: List[str]
    red_flags: List[str]
    expected_treatment: Optional[ExpectedTreatmentInput] = None

class CreatePatientRequest(BaseModel):
    identity: IdentityInput
    chief_complaint: ChiefComplaintInput
    history: List[MedicalFact]
    risk_factors: List[MedicalFact] = []
    travel_history: List[MedicalFact] = []
    family_history: List[MedicalFact] = []
    vitals: List[MedicalFact]
    past_medical_history: List[MedicalFact] = []
    treatments: List[MedicalFact] = []
    allergies: List[MedicalFact] = []
    social_history: List[MedicalFact] = []
    surgical_history: List[MedicalFact] = []
    metadata: MetadataInput

class CreatePatientResponse(BaseModel):
    patient_num: int
    patient_id: str
    status: str

class DeletePatientResponse(BaseModel):
    patient_num: int
    patient_id: str
    status: str
    deleted_chunks: int
