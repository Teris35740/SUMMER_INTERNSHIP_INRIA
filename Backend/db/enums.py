from enum import Enum

class UserRole(str, Enum):
    PROFESSOR = "PROFESSOR"
    STUDENT = "STUDENT"