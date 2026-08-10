from pydantic import BaseModel
from typing import Optional, List

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

class DiagnoseRequest(BaseModel):
    diagnosis: str
    session_id: str = "session_1"
    patient_num: int = 1
    is_pedago_mode: bool = False

class DiagnoseResponse(BaseModel):
    is_correct: bool
    feedback: str
    expected_diagnosis: str
    question_count: int
    report: Optional[dict] = None

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
