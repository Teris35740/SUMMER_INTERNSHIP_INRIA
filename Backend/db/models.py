import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped, mapped_column

from db.enums import UserRole

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    patients: Mapped[list["Patient"]] = relationship(back_populates="creator", foreign_keys="Patient.created_by")
    uploaded_images: Mapped[list["PatientImage"]] = relationship(back_populates="uploader", foreign_keys="PatientImage.uploaded_by")
    scientific_documents: Mapped[list["ScientificDocument"]] = relationship(back_populates="uploader")



class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    patient_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    patient_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    is_temporary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True)
    specialty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    creator: Mapped["User"] = relationship(back_populates="patients", foreign_keys=[created_by])
    images: Mapped[list["PatientImage"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_patients_temporary_expires", "is_temporary", "expires_at"),
        Index("ix_patients_patient_data", "patient_data", postgresql_using="gin"),
    )



class PatientImage(Base):
    __tablename__ = "patient_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    fact_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    image_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reveal_policy: Mapped[str] = mapped_column(String(100), nullable=False, default="direct_if_asked", server_default="direct_if_asked")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    patient: Mapped["Patient"] = relationship(back_populates="images")
    uploader: Mapped["User"] = relationship(back_populates="uploaded_images", foreign_keys=[uploaded_by])



class ScientificDocument(Base):
    __tablename__ = "scientific_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/pdf", server_default="application/pdf")
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weaviate_source_tag: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_ingested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    uploader: Mapped["User"] = relationship(back_populates="scientific_documents")