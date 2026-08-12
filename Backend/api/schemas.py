from pydantic import BaseModel
from typing import Optional, List, Dict

class AskRequest(BaseModel):
    question: str
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False

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

class DiagnoseRequest(BaseModel):
    diagnosis: str
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False

class DiagnoseResponse(BaseModel):
    is_correct: bool
    feedback: str
    expected_diagnosis: str
    report: Optional[dict] = None
    elapsed_seconds: Optional[float] = None
    time_expired: bool = False

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

